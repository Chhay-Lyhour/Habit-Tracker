import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an open tab asks the server whether a new build exists. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Registers the service worker and tells the user about it. Renders nothing
 * itself — both messages go through the app's sonner <Toaster>, whose region
 * is aria-live="polite", so screen readers hear them without being
 * interrupted.
 *
 * - "Ready to work offline": once, on first install (offlineReady).
 * - "New version available": whenever a new build is waiting (needRefresh,
 *   registerType: 'prompt'). Stays until acted on. Refresh activates the new
 *   worker and reloads; "Not now" keeps the old version until next visit.
 *
 * Under `npm run dev` the plugin swaps this hook for a no-op stub, so nothing
 * registers there. Test with `npm run build && npm run preview`.
 *
 * Mounted once in App.jsx, outside every ErrorBoundary: if a section crashes,
 * the user must still be able to pick up the fix.
 */
export function UpdateToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // A tab left open for days would otherwise only look for updates on
      // navigation. Skip while offline — the check would just fail.
      if (!registration) return
      setInterval(() => {
        if (navigator.onLine) registration.update()
      }, UPDATE_CHECK_MS)
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) console.error('Service worker registration failed', error)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    toast.success('Ready to work offline', {
      id: 'pwa-offline-ready',
      description: 'Habit Tracker is installed on this device.',
      onDismiss: () => setOfflineReady(false),
      onAutoClose: () => setOfflineReady(false),
    })
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    if (!needRefresh) return
    toast('New version available', {
      id: 'pwa-update',
      description: 'Refresh to get the latest Habit Tracker.',
      duration: Infinity,
      action: {
        label: 'Refresh',
        onClick: () => updateServiceWorker(true),
      },
      cancel: {
        label: 'Not now',
        onClick: () => setNeedRefresh(false),
      },
      onDismiss: () => setNeedRefresh(false),
    })
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
