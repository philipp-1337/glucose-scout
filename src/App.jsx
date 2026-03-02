import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Toaster } from 'sonner'
import GlucoseChart from './components/GlucoseChart'
import { auth, db, googleProvider, hasFirebaseConfig } from './firebase'
import { usePwaPrompt } from './hooks/usePwaPrompt'
import { usePwaUpdate } from './hooks/usePwaUpdate'

const ENTRY_LIMIT = Number(import.meta.env.VITE_ENTRY_LIMIT ?? 72)

const TREND_MAP = {
  TripleUp: { arrow: '⇈', label: 'steigt sehr stark' },
  DoubleUp: { arrow: '↑↑', label: 'steigt stark' },
  SingleUp: { arrow: '↑', label: 'steigt' },
  FortyFiveUp: { arrow: '↗', label: 'steigt leicht' },
  Flat: { arrow: '→', label: 'stabil' },
  FortyFiveDown: { arrow: '↘', label: 'fällt leicht' },
  SingleDown: { arrow: '↓', label: 'fällt' },
  DoubleDown: { arrow: '↓↓', label: 'fällt stark' },
  TripleDown: { arrow: '⇊', label: 'fällt sehr stark' }
}

function getRangeLabel(value) {
  if (value < 70) return { label: 'Niedrig', color: 'text-glucose-low' }
  if (value > 180) return { label: 'Hoch', color: 'text-glucose-high' }
  return { label: 'Im Zielbereich', color: 'text-glucose-inrange' }
}

function formatDate(date) {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

export default function App() {
  usePwaPrompt()
  usePwaUpdate()

  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(hasFirebaseConfig)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsExpanded, setSettingsExpanded] = useState(true)

  const [nightscoutConfig, setNightscoutConfig] = useState({
    url: '',
    token: ''
  })

  const [draftConfig, setDraftConfig] = useState({
    url: '',
    token: ''
  })

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setAuthLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user || !db) {
      setNightscoutConfig({ url: '', token: '' })
      setDraftConfig({ url: '', token: '' })
      setSettingsExpanded(true)
      return
    }

    const loadUserSettings = async () => {
      setSettingsLoading(true)
      setSettingsError('')

      try {
        const ref = doc(db, 'users', user.uid, 'settings', 'nightscout')
        const snapshot = await getDoc(ref)
        const data = snapshot.data() ?? {}
        const nextConfig = {
          url: String(data.url ?? ''),
          token: String(data.token ?? '')
        }
        const hasSavedConfig = Boolean(nextConfig.url.trim()) && Boolean(nextConfig.token.trim())

        setNightscoutConfig(nextConfig)
        setDraftConfig(nextConfig)
        setSettingsExpanded(!hasSavedConfig)
      } catch (loadError) {
        setSettingsError(loadError instanceof Error ? loadError.message : 'Settings konnten nicht geladen werden')
      } finally {
        setSettingsLoading(false)
      }
    }

    loadUserSettings()
  }, [user])

  const hasNightscoutConfig =
    Boolean(user) &&
    Boolean(nightscoutConfig.url.trim()) && Boolean(nightscoutConfig.token.trim())

  const loadEntries = useCallback(async () => {
    if (!hasNightscoutConfig) {
      setEntries([])
      setLastUpdate(null)
      setError('')
      return
    }

    setError('')

    try {
      const endpoint = `${nightscoutConfig.url.replace(/\/$/, '')}/api/v2/entries.json?count=${ENTRY_LIMIT}&token=${nightscoutConfig.token}`
      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error(`API-Fehler: ${response.status}`)
      }

      const data = await response.json()
      const normalized = data
        .map((entry) => ({
          value: Number(entry.sgv ?? entry.mbg),
          time: new Date(entry.date ?? entry.dateString),
          direction: entry.direction ?? 'Flat'
        }))
        .filter((entry) => Number.isFinite(entry.value) && !Number.isNaN(entry.time.getTime()))
        .sort((a, b) => a.time - b.time)

      setEntries(normalized)
      setLastUpdate(new Date())
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unbekannter Fehler')
    }
  }, [hasNightscoutConfig, nightscoutConfig.token, nightscoutConfig.url])

  useEffect(() => {
    if (!hasNightscoutConfig) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    loadEntries().finally(() => setIsLoading(false))

    const timer = setInterval(loadEntries, 60_000)
    return () => clearInterval(timer)
  }, [hasNightscoutConfig, loadEntries])

  const handleSignIn = async () => {
    if (!auth || !googleProvider) return

    setSettingsError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (signInError) {
      setSettingsError(signInError instanceof Error ? signInError.message : 'Login fehlgeschlagen')
    }
  }

  const handleSignOut = async () => {
    if (!auth) return
    await signOut(auth)
  }

  const handleSaveSettings = async (event) => {
    event.preventDefault()
    if (!user || !db) return

    const nextConfig = {
      url: draftConfig.url.trim(),
      token: draftConfig.token.trim()
    }

    setSettingsSaving(true)
    setSettingsError('')

    try {
      const ref = doc(db, 'users', user.uid, 'settings', 'nightscout')
      await setDoc(
        ref,
        {
          ...nextConfig,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )

      setNightscoutConfig(nextConfig)
      setSettingsExpanded(false)
    } catch (saveError) {
      setSettingsError(saveError instanceof Error ? saveError.message : 'Settings konnten nicht gespeichert werden')
    } finally {
      setSettingsSaving(false)
    }
  }

  const latest = entries.at(-1)
  const previous = entries.at(-2)

  const delta = useMemo(() => {
    if (!latest || !previous) return null
    return latest.value - previous.value
  }, [latest, previous])

  const range = latest ? getRangeLabel(latest.value) : null
  const trend = latest ? TREND_MAP[latest.direction] ?? TREND_MAP.Flat : { arrow: '…', label: 'keine Daten' }
  const latestRows = entries.slice(-8).reverse()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_45%,_#020617_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-white/20 bg-slate-950/55 p-6 shadow-glass backdrop-blur">
          <div className="flex items-center gap-4">
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.03em] sm:tracking-[0.25em] text-slate-300">Nightscout Monitor</p>
              <h1 className="font-bold text-4xl sm:text-5xl">Glubloo</h1>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center">
              <img src="/bubbles.svg" alt="Glucose Scout Logo" className="h-12 w-12 object-contain" />
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Live-Blick auf deinen Blutzucker mit Login, gesicherten Settings und Auto-Refresh.
          </p>
        </header>

        {!hasFirebaseConfig ? (
          <section className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-6 text-amber-100 shadow-glass">
            <p className="font-semibold">Firebase Konfiguration fehlt</p>
            <p className="mt-1 text-sm">
              Bitte setze `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` und
              `VITE_FIREBASE_APP_ID` in deiner `.env`.
            </p>
          </section>
        ) : null}

        {authLoading ? (
          <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-glass">
            Login-Status wird geprüft...
          </section>
        ) : null}

        {hasFirebaseConfig && !authLoading && !user ? (
          <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-glass">
            <h2 className="text-lg font-semibold">Anmeldung</h2>
            <p className="mt-2 text-sm text-slate-300">
              Melde dich mit deinem Google-Account an, um deine Nightscout-Settings sicher in Firestore zu speichern.
            </p>
            <button
              type="button"
              onClick={handleSignIn}
              className="mt-4 rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-900 transition hover:bg-white"
            >
              Mit Google anmelden
            </button>
          </section>
        ) : null}

        {hasFirebaseConfig && user ? (
          <>
            <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-5 shadow-glass">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-200">
                  Eingeloggt als <span className="font-semibold">{user.email}</span>
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Abmelden
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-glass">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Nightscout Einstellungen</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Gespeichert unter `users/{'{uid}'}/settings/nightscout` in Firestore.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsExpanded((prev) => !prev)}
                  className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  {settingsExpanded ? 'Ausblenden' : 'Anzeigen'}
                </button>
              </div>

              {settingsLoading ? <p className="mt-3 text-sm text-slate-300">Einstellungen werden geladen...</p> : null}

              {!settingsExpanded && hasNightscoutConfig ? (
                <p className="mt-3 text-sm text-slate-300">Nightscout-Zugang ist gespeichert.</p>
              ) : null}

              {settingsExpanded ? (
                <form className="mt-4 space-y-3" onSubmit={handleSaveSettings}>
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-300">Nightscout URL</span>
                    <input
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-slate-300"
                      type="url"
                      placeholder="https://deine-instanz.example"
                      value={draftConfig.url}
                      onChange={(event) =>
                        setDraftConfig((prev) => ({
                          ...prev,
                          url: event.target.value
                        }))
                      }
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-300">Nightscout Token</span>
                    <input
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-slate-300"
                      type="password"
                      placeholder="dein-read-token"
                      value={draftConfig.token}
                      onChange={(event) =>
                        setDraftConfig((prev) => ({
                          ...prev,
                          token: event.target.value
                        }))
                      }
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="rounded-xl bg-glucose-inrange px-4 py-2 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {settingsSaving ? 'Speichern...' : 'Einstellungen speichern'}
                  </button>
                </form>
              ) : null}
            </section>
          </>
        ) : null}

        {settingsError ? (
          <section className="rounded-2xl border border-rose-300/40 bg-rose-500/10 p-6 text-rose-100 shadow-glass">
            <p className="font-semibold">Hinweis</p>
            <p className="text-sm">{settingsError}</p>
          </section>
        ) : null}

        {hasFirebaseConfig && user && !hasNightscoutConfig ? (
          <section className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-6 text-amber-100 shadow-glass">
            Hinterlege URL und Token, damit Glukose-Daten geladen werden können.
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-glass">
            Daten werden geladen...
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-rose-300/40 bg-rose-500/10 p-6 text-rose-100 shadow-glass">
            <p className="font-semibold">Abruf fehlgeschlagen</p>
            <p className="text-sm">{error}</p>
          </section>
        ) : null}

        {!isLoading && !error && latest ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-glass">
                <p className="text-sm text-slate-300">Aktueller Wert</p>
                <p className="mt-2 text-5xl font-semibold">
                  {latest.value}
                  <span className="ml-2 text-base font-medium text-slate-300">mg/dL</span>
                </p>
                <p className={`mt-3 text-sm font-semibold ${range.color}`}>{range.label}</p>
              </article>

              <article className="rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-glass">
                <p className="text-sm text-slate-300">Trend</p>
                <p className="mt-2 text-5xl font-semibold">{trend.arrow}</p>
                <p className="mt-3 text-sm text-slate-200">{trend.label}</p>
              </article>

              <article className="rounded-2xl border border-white/15 bg-slate-900/65 p-6 shadow-glass">
                <p className="text-sm text-slate-300">Delta zum letzten Wert</p>
                <p className="mt-2 text-5xl font-semibold">
                  {delta === null ? '–' : `${delta > 0 ? '+' : ''}${delta}`}
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Zuletzt aktualisiert: {lastUpdate ? formatDate(lastUpdate) : '–'}
                </p>
              </article>
            </section>

            <GlucoseChart points={entries} />

            <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-5 shadow-glass">
              <h2 className="text-lg font-semibold">Letzte Messwerte</h2>
              <div className="mt-3 space-y-2">
                {latestRows.map((entry) => (
                  <div
                    key={`${entry.time.toISOString()}-${entry.value}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-200">{formatDate(entry.time)}</span>
                    <span className="font-semibold">
                      {entry.value} mg/dL
                      <span className="ml-2 text-slate-300">{(TREND_MAP[entry.direction] ?? TREND_MAP.Flat).arrow}</span>
                      <span className="ml-2 text-xs font-medium text-slate-400">
                        {(TREND_MAP[entry.direction] ?? TREND_MAP.Flat).label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
      <Toaster
        richColors
        position="top-right"
        mobileOffset={20}
        offset={20}
        closeButton={false}
        expand
        toastOptions={{
          style: {
            pointerEvents: 'auto'
          }
        }}
      />
    </main>
  )
}
