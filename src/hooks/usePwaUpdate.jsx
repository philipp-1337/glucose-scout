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
        <div className="block rounded-xl border border-slate-700 bg-slate-900 p-1 text-slate-100">
          <div className="mb-1 block font-semibold">Update verfügbar</div>
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
            className="relative z-[9999] inline-flex min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-slate-950 transition hover:bg-emerald-500 active:bg-emerald-500"
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
