import { useEffect, useRef } from 'react'
import { RefreshCwIcon } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { SW_UPDATE_CHECK_INTERVAL } from '../constants'

export function usePwaUpdate() {
  const updateToastShown = useRef(false)
  const updateIntervalId = useRef(undefined)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return
      if (updateIntervalId.current !== undefined) {
        clearInterval(updateIntervalId.current)
      }
      updateIntervalId.current = window.setInterval(() => {
        registration.update()
      }, SW_UPDATE_CHECK_INTERVAL)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    }
  })

  useEffect(() => {
    if (needRefresh && !updateToastShown.current) {
      updateToastShown.current = true

      const handleUpdate = () => {
        toast.dismiss('update-toast')
        updateServiceWorker(true)
      }

      toast(
        <div className="block rounded-2xl border border-white/15 bg-slate-950/55 p-4 text-slate-100 shadow-glass backdrop-blur">
          <div className="mb-1 block text-sm font-semibold text-white">Update verfügbar</div>
          <div className="mb-3 block text-sm text-slate-300">
            Eine neue Glubloo-Version ist bereit.
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              handleUpdate()
            }}
            className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 rounded-xl bg-glucose-inrange px-4 py-2 font-semibold text-slate-950 transition hover:brightness-110"
          >
            <RefreshCwIcon size={16} /> Aktualisieren
          </button>
        </div>,
        {
          duration: Number.POSITIVE_INFINITY,
          className: 'update-toast',
          dismissible: false,
          id: 'update-toast'
        }
      )
    } else if (!needRefresh && updateToastShown.current) {
      updateToastShown.current = false
      toast.dismiss('update-toast')
    }
  }, [needRefresh, updateServiceWorker])

  useEffect(() => {
    return () => {
      if (updateIntervalId.current !== undefined) {
        clearInterval(updateIntervalId.current)
      }
    }
  }, [])
}
