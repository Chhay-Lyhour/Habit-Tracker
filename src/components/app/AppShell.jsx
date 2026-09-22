import { Flame } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ErrorBoundary } from '@/components/app/ErrorBoundary'
import { OfflineBanner } from '@/components/app/OfflineBanner'
import { SectionFallback } from '@/components/app/SectionFallback'

/**
 * The frame every signed-in screen sits in: sticky header, brand mark, a slot
 * for header actions (the account menu), and a centred, gutter-safe main
 * column.
 *
 * The header has its own error boundary, so a crash in the account menu or
 * avatar leaves the page below it working. Its fallback is the compact
 * one-line form — a full card would not fit in a 64px bar.
 */
export function AppShell({ actions, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* safe-top: under a notch / the installed app's status bar, the header
          grows downward instead of sliding beneath it. */}
      <header className="safe-top sticky top-0 z-30 border-b-2 border-border bg-card">
        <div className="safe-x mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3">
          <ErrorBoundary
            name="nav"
            fallback={({ reset }) => (
              <SectionFallback compact label="The menu" onRetry={reset} />
            )}
          >
            {/* min-w-0 + truncate: at 320px the brand, Share and the avatar
                share 288px — the name gives way before anything overflows. */}
            <Link
              to="/"
              className="flex min-h-12 min-w-0 items-center gap-2 rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
            >
              <Flame
                className="size-7 shrink-0 text-streak-bright"
                aria-hidden="true"
              />
              <span className="font-heading truncate text-lg font-extrabold tracking-tight">
                Habit Tracker
              </span>
            </Link>

            {actions ? (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            ) : null}
          </ErrorBoundary>
        </div>

        {/* Inside the sticky header so it stays in view while scrolling. Its
            own boundary with no fallback: if the banner ever breaks, losing
            the banner beats losing the header. */}
        <ErrorBoundary name="offline-banner" fallback={null}>
          <OfflineBanner />
        </ErrorBoundary>
      </header>

      <main className="safe-x safe-bottom mx-auto w-full max-w-3xl flex-1 pt-6 sm:pt-8">
        {children}
      </main>
    </div>
  )
}
