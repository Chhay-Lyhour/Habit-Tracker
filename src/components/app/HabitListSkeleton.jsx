import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Placeholder rows shown while the habit list is loading. */
export function HabitListSkeleton({ rows = 3 }) {
  return (
    <ul className="space-y-4" aria-busy="true" aria-live="polite">
      <li className="sr-only">Loading your habits…</li>

      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <Card>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="hidden h-7 w-20 rounded-full sm:block" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
