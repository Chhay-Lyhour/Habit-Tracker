import { Flame } from 'lucide-react'

import { cn } from 'cn'

/**
 * Day counter with a flame. The flame only flickers once the streak is alive,
 * so a zero streak stays visually quiet.
 */
export function StreakBadge({ days = 0, className }) {
  const alive = days > 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold tabular-nums',
        alive ? 'bg-streak/10 text-streak' : 'bg-muted text-muted-foreground',
        className
      )}
    >
      <Flame
        aria-hidden="true"
        className={cn(
          'size-4',
          alive && 'animate-flame-flicker text-streak-bright'
        )}
      />
      {days}
      <span className="sr-only"> day streak</span>
      <span aria-hidden="true" className="font-bold">
        {days === 1 ? 'day' : 'days'}
      </span>
    </span>
  )
}
