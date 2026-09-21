import { Check, Flame, ListChecks } from 'lucide-react'

import { cn } from 'cn'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const TILES = [
  {
    key: 'streak',
    label: 'Best streak',
    icon: Flame,
    tone: 'bg-streak/10 text-streak',
    iconTone: 'text-streak-bright',
  },
  {
    key: 'done',
    label: 'Done today',
    icon: Check,
    tone: 'bg-grass/10 text-grass',
    iconTone: 'text-grass-bright',
  },
  {
    key: 'total',
    label: 'Habits',
    icon: ListChecks,
    tone: 'bg-sky/10 text-sky',
    iconTone: 'text-sky-bright',
  },
]

/**
 * Three numbers, all derived from what useHabits already fetched — no extra
 * query. Loading shows skeleton tiles; with no habits the zeros are the empty
 * state. On a failed load it renders nothing: the habit list below already
 * shows the error and its Retry, and one error message is enough.
 */
export function StatsSection({ status, habits, doneToday, streaks }) {
  if (status === 'error') return null

  const active = habits.filter((habit) => habit.is_active)
  const values = {
    streak: Math.max(0, ...active.map((habit) => streaks.get(habit.id) ?? 0)),
    done: `${active.filter((habit) => doneToday.has(habit.id)).length}/${active.length}`,
    total: habits.length,
  }

  return (
    <ul
      className="grid grid-cols-3 gap-3 sm:gap-4"
      aria-busy={status === 'loading' || undefined}
    >
      {TILES.map(({ key, label, icon: Icon, tone, iconTone }) => (
        <li key={key}>
          <Card className="h-full">
            <CardContent className="flex flex-col items-center gap-2 px-2 text-center sm:flex-row sm:gap-3 sm:px-4 sm:text-left">
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-full',
                  tone
                )}
              >
                <Icon aria-hidden="true" className={cn('size-5', iconTone)} />
              </span>
              <div className="min-w-0">
                {status === 'loading' ? (
                  <Skeleton className="mx-auto h-7 w-10 sm:mx-0" />
                ) : (
                  <p className="font-heading text-2xl font-extrabold tabular-nums">
                    {values[key]}
                  </p>
                )}
                <p className="text-xs font-bold text-muted-foreground sm:text-sm">
                  {label}
                </p>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
