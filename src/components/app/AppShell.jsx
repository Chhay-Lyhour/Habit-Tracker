import { Flame } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * The frame every signed-in screen sits in: sticky header, brand mark, a slot
 * for header actions (the sign-out button lands here in Phase D), and a
 * centred, gutter-safe main column.
 */
export function AppShell({ actions, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b-2 border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
          >
            <Flame className="size-7 text-streak-bright" aria-hidden="true" />
            <span className="font-heading text-lg font-extrabold tracking-tight">
              Habit Tracker
            </span>
          </Link>

          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  )
}
