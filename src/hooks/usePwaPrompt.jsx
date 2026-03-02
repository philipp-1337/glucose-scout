import { useEffect, useRef, useState } from 'react'
import { DownloadIcon, MoreHorizontal, ShareIcon, SquarePlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PWA_INSTALL_PROMPT_DELAY } from '../constants'

function getIosVersion() {
  if (typeof window === 'undefined') return null
  const match = window.navigator.userAgent.match(/OS (\d+)_/)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

function checkIsIos() {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent
  const isIosDevice = /iPad|iPhone|iPod/.test(userAgent)
  const isStandalone = 'standalone' in window.navigator && window.navigator.standalone
  return isIosDevice && !isStandalone
}

const iosVersion = getIosVersion()
const isIos = checkIsIos()

function IosInstallToast({ onClose }) {
  const isNewIos = iosVersion && iosVersion >= 18

  return (
    <div className="relative max-w-sm rounded-2xl border border-white/15 bg-slate-950/55 p-4 pl-12 text-slate-100 shadow-glass backdrop-blur">
      <button
        type="button"
        onClick={onClose}
        className="absolute left-3 top-3 rounded-lg border border-white/15 bg-slate-900/60 p-1 text-slate-300 transition hover:bg-white/10"
        aria-label="Schließen"
      >
        <XIcon size={16} />
      </button>
      <div className="pr-6 text-center leading-relaxed">
        <div className="mb-2 text-sm font-semibold text-white">Glubloo auf dem Homescreen installieren</div>
        {isNewIos ? (
          <div className="text-sm text-slate-200">
            <span className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-900/70">
              <MoreHorizontal size={16} />
            </span>{' '}
            →{' '}
            <span className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-sky-900/55 text-sky-200">
              <ShareIcon size={16} />
            </span>{' '}
            →{' '}
            <span className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-900/70">
              <MoreHorizontal size={16} />
            </span>{' '}
            Mehr →{' '}
            <span className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-emerald-900/55 text-emerald-200">
              <SquarePlusIcon size={16} />
            </span>{' '}
            Zum Home-Bildschirm
          </div>
        ) : (
          <div className="text-sm text-slate-200">
            <span className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-sky-900/55 text-sky-200">
              <ShareIcon size={16} />
            </span>{' '}
            →{' '}
            <span className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-emerald-900/55 text-emerald-200">
              <SquarePlusIcon size={16} />
            </span>{' '}
            Zum Home-Bildschirm
          </div>
        )}
      </div>
    </div>
  )
}

function NonIosInstallToast({ onInstall, onLater }) {
  return (
    <div className="max-w-sm rounded-2xl border border-white/15 bg-slate-950/55 p-4 text-slate-100 shadow-glass backdrop-blur">
      <div className="text-center">
        <div className="mb-1 text-sm font-semibold text-white">Glubloo installieren?</div>
        <div className="mb-3 text-sm text-slate-300">
          Für schnelleren Zugriff und Nutzung wie eine native App.
        </div>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onLater}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-slate-200 transition hover:bg-white/10"
          >
            Später
          </button>
          <button
            type="button"
            onClick={onInstall}
            className="inline-flex items-center gap-2 rounded-xl bg-glucose-inrange px-4 py-2 font-semibold text-slate-950 transition hover:brightness-110"
          >
            <DownloadIcon size={16} />
            Installieren
          </button>
        </div>
      </div>
    </div>
  )
}

export function usePwaPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const installToastShown = useRef(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setTimeout(() => setShowInstallPrompt(true), PWA_INSTALL_PROMPT_DELAY)
    }

    if (isIos) {
      setTimeout(() => setShowInstallPrompt(true), PWA_INSTALL_PROMPT_DELAY)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    if (showInstallPrompt && !installToastShown.current) {
      installToastShown.current = true

      const handleClose = () => {
        installToastShown.current = false
        setShowInstallPrompt(false)
        toast.dismiss('pwa-toast')
      }

      const handleInstall = () => {
        if (installPrompt) installPrompt.prompt()
        handleClose()
      }

      toast.custom(
        () =>
          isIos ? (
            <IosInstallToast onClose={handleClose} />
          ) : (
            <NonIosInstallToast onInstall={handleInstall} onLater={handleClose} />
          ),
        {
          duration: Number.POSITIVE_INFINITY,
          id: 'pwa-toast',
          dismissible: isIos
        }
      )
    } else if (!showInstallPrompt && installToastShown.current) {
      installToastShown.current = false
      toast.dismiss('pwa-toast')
    }
  }, [showInstallPrompt, installPrompt])
}
