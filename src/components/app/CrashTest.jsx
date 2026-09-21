/**
 * ============================================================================
 * DEV-ONLY crash trigger for screenshotting error boundaries. REMOVE before
 * the final commit — see "CrashTest" in AGENTS.md for every place it is used.
 * ============================================================================
 *
 * Renders nothing. Throws during render when the URL has ?crash=<section>
 * matching its `section` prop — nav, avatar, stats or habits:
 *
 *   http://localhost:5173/?crash=habits
 *
 * Only a render-time throw reaches an ErrorBoundary, which is the point of
 * the demo. The same throw inside an onClick or after an await would not.
 *
 * "Try again" (SectionFallback) calls disarmCrashTest() before resetting, so
 * the section recovers instead of crashing again at once. Reload the page to
 * re-arm it.
 *
 * In a production build import.meta.env.DEV is false and the whole check is
 * compiled away.
 */

let disarmed = false

// Kept beside the component so deleting this one file removes all of it.
// eslint-disable-next-line react-refresh/only-export-components -- dev-only
export function disarmCrashTest() {
  disarmed = true
}

export function CrashTest({ section }) {
  if (!import.meta.env.DEV || disarmed) return null

  const target = new URLSearchParams(window.location.search).get('crash')
  if (target === section) {
    throw new Error(`CrashTest: simulated render error in "${section}"`)
  }

  return null
}
