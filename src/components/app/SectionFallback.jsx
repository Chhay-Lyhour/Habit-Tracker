import { RotateCw } from 'lucide-react'

import { cn } from 'cn'
import { Button } from '@/components/ui/button'

/**
 * What an ErrorBoundary shows in place of a section that crashed while
 * rendering. Friendly copy only — never the error message or stack, which
 * mean nothing to a user and leak internals. ErrorBoundary logs those in dev.
 *
 * Use it through the boundary's function fallback so it gets `reset`:
 *
 *   <ErrorBoundary
 *     name="stats"
 *     fallback={({ reset }) => <SectionFallback label="Your stats" onRetry={reset} />}
 *   >
 *
 * `compact` is a one-line version for tight spots like the header.
 *
 * Kept deliberately simple: an error thrown here would skip this boundary and
 * go to the next one up.
 */
export function SectionFallback({
  label,
  emoji = '🙈',
  title = 'This part took a tumble.',
  description = 'The rest of your habits are safe.',
  onRetry,
  compact = false,
  className,
}) {
  if (compact) {
    return (
      <div
        role="alert"
        className={cn('flex min-w-0 items-center gap-3 text-sm', className)}
      >
        <span role="img" aria-label="">
          {emoji}
        </span>
        <span className="truncate font-bold">
          {label ? `${label} took a tumble.` : title}
        </span>
        {onRetry ? (
          <Button
            variant="quiet"
            size="touch"
            onClick={onRetry}
            className="shrink-0 px-3"
          >
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-4 rounded-card border-2 border-border bg-card px-6 py-10 text-center',
        className
      )}
    >
      <span
        className="grid size-16 place-items-center rounded-full bg-streak/10 text-3xl"
        role="img"
        aria-label=""
      >
        {emoji}
      </span>

      <div className="space-y-1.5">
        {label ? (
          <p className="text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
        ) : null}
        <h2 className="font-heading text-xl font-extrabold">{title}</h2>
        <p className="mx-auto max-w-sm text-base text-muted-foreground">
          {description}
        </p>
      </div>

      {onRetry ? (
        <Button variant="quiet" size="touch" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
