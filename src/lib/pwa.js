/**
 * Service-worker cache housekeeping.
 *
 * Workbox keeps the app shell in a cache whose name starts with
 * "workbox-precache". Every other cache in this origin was created by a
 * runtimeCaching rule (vite.config.js) — and those can hold responses fetched
 * with the signed-in user's token.
 */
const PRECACHE_PREFIX = 'workbox-precache'

/**
 * Deletes every runtime cache, keeping only the precached app shell (so the
 * app still opens offline for the next person).
 *
 * Called on sign-out. A service-worker cache is keyed by URL, not by user, and
 * outlives the session: without this, on a shared device user B could be
 * served user A's cached API responses.
 *
 * Works whatever cache names the runtimeCaching rules choose, because it
 * deletes by "not the precache" rather than by name. Never throws — a failure
 * here must not block signing out.
 */
export async function clearRuntimeCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) return 0

  try {
    const names = await window.caches.keys()
    const runtime = names.filter((name) => !name.startsWith(PRECACHE_PREFIX))
    await Promise.all(runtime.map((name) => window.caches.delete(name)))
    return runtime.length
  } catch {
    return 0
  }
}
