import { Clock, RotateCw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * A habit created offline that has not reached the server yet.
 *
 * Deliberately inert: no tick, no edit, no delete. It has no row in the
 * database, so there is nothing for those to act on until it syncs. Muted and
 * dashed so it reads as "not quite real yet" next to the saved habits.
 *
 * If a sync attempt failed for a reason other than being offline (lastError),
 * it offers Retry and a way to discard it — otherwise a habit the server will
 * never accept would sit in the queue forever.
 */
export function QueuedHabitCard({ item, offline, onRetry, onDiscard }) {
  const failed = Boolean(item.lastError)
  const labelId = `queued-title-${item.id}`

  return (
    <Card
      aria-labelledby={labelId}
      className="border-dashed bg-muted/40 text-muted-foreground"
    >
      <CardContent className="flex items-center gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-dashed border-border"
          aria-hidden="true"
        >
          <Clock className="size-6" />
        </span>

        <div className="min-w-0 flex-1">
          <h3
            id={labelId}
            className="font-heading truncate text-lg font-extrabold"
          >
            {item.title}
          </h3>
          <p className="text-xs font-bold tracking-wide uppercase">
            {failed ? 'Didn’t sync' : 'Queued'}
            <span className="sr-only">
              {failed
                ? ' — this habit could not be saved yet.'
                : ' — will be saved when you are back online.'}
            </span>
          </p>
        </div>

        {failed ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="touch-icon"
              onClick={onRetry}
              disabled={offline}
              aria-label={`Retry saving ${item.title}`}
            >
              <RotateCw aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="touch-icon"
              onClick={() => onDiscard(item.id)}
              aria-label={`Discard ${item.title}`}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
