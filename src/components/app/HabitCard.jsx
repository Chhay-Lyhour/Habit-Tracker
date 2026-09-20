import { useState } from 'react'
import { Check, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react'

import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StreakBadge } from '@/components/app/StreakBadge'
import { SuccessBurst } from '@/components/app/SuccessBurst'

/**
 * One habit in the list: a big tick target, the habit's name, its streak, and
 * an overflow menu for edit / delete.
 *
 * Presentational only — it owns nothing but the burst animation. All data
 * changes go back up through the callbacks.
 */
export function HabitCard({
  habit,
  completed = false,
  streak = 0,
  pending = false,
  onToggle,
  onEdit,
  onDelete,
}) {
  const [burstKey, setBurstKey] = useState(null)

  function handleToggle() {
    // Only celebrate completing, never un-completing.
    if (!completed) setBurstKey(Date.now())
    onToggle?.(habit, !completed)
  }

  const labelId = `habit-title-${habit.id}`

  return (
    <Card
      className={cn(
        'transition-colors',
        completed && 'border-grass-bright/60 bg-accent/40',
        !habit.is_active && 'opacity-60'
      )}
    >
      <CardContent className="flex items-center gap-4">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            aria-pressed={completed}
            aria-describedby={labelId}
            aria-label={
              completed
                ? `Mark ${habit.title} as not done today`
                : `Mark ${habit.title} as done today`
            }
            className={cn(
              'grid size-12 place-items-center rounded-full border-2 outline-none transition-colors',
              'focus-visible:ring-3 focus-visible:ring-ring/60',
              'disabled:cursor-not-allowed disabled:opacity-60',
              completed
                ? 'border-grass bg-grass text-white'
                : 'border-border bg-card text-transparent hover:border-grass hover:text-grass/30'
            )}
          >
            {pending ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <Check
                className={cn('size-6', completed && 'animate-habit-pop')}
                strokeWidth={3}
                aria-hidden="true"
              />
            )}
          </button>

          <SuccessBurst burstKey={burstKey} />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            id={labelId}
            className={cn(
              'font-heading truncate text-lg font-extrabold',
              completed && 'text-accent-foreground'
            )}
          >
            {habit.title}
          </h3>

          {habit.description ? (
            <p className="truncate text-sm text-muted-foreground">
              {habit.description}
            </p>
          ) : null}

          {!habit.is_active ? (
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Paused
            </p>
          ) : null}
        </div>

        <StreakBadge days={streak} className="hidden shrink-0 sm:inline-flex" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="touch-icon"
              className="shrink-0"
              aria-label={`Options for ${habit.title}`}
            >
              <MoreVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit?.(habit)}>
              <Pencil aria-hidden="true" />
              Edit habit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete?.(habit)}
            >
              <Trash2 aria-hidden="true" />
              Delete habit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
