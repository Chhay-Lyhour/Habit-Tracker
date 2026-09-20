import { RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Shown when a query actually failed. Always offers a way back: retrying is
 * usually all it takes.
 */
export function ErrorState({
  title = 'That did not load',
  description = 'Something went wrong on our side. Give it another go.',
  onRetry,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-card border-2 border-border bg-card px-6 py-14 text-center"
    >
      <span
        className="grid size-20 place-items-center rounded-full bg-danger/10 text-4xl"
        role="img"
        aria-label=""
      >
        😕
      </span>

      <div className="space-y-1.5">
        <h2 className="font-heading text-xl font-extrabold">{title}</h2>
        <p className="mx-auto max-w-sm text-base text-muted-foreground">
          {description}
        </p>
      </div>

      {onRetry ? (
        <Button variant="quiet" size="touch" onClick={onRetry} className="mt-2">
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
