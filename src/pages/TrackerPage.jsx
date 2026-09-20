import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { AppShell } from '@/components/app/AppShell'
import { DeleteHabitDialog } from '@/components/app/DeleteHabitDialog'
import { EmptyState } from '@/components/app/EmptyState'
import { ErrorState } from '@/components/app/ErrorState'
import { HabitCard } from '@/components/app/HabitCard'
import { HabitFormDialog } from '@/components/app/HabitFormDialog'
import { HabitListSkeleton } from '@/components/app/HabitListSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { UserMenu } from '@/components/app/UserMenu'
import { Button } from '@/components/ui/button'
import { useHabits } from '@/hooks/useHabits'
import { friendlyDataError } from '@/lib/habits'

const CHEERS = [
  'Nice! One more day on the board.',
  'That’s the streak alive.',
  'Done. See you tomorrow.',
  'Another one down.',
]

export function TrackerPage() {
  const {
    habits,
    doneToday,
    streaks,
    status,
    error,
    saving,
    busyHabitIds,
    refresh,
    toggleToday,
    create,
    update,
    remove,
  } = useHabits()

  const [formOpen, setFormOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [deletingHabit, setDeletingHabit] = useState(null)

  function openCreate() {
    setEditingHabit(null)
    setFormOpen(true)
  }

  function openEdit(habit) {
    setEditingHabit(habit)
    setFormOpen(true)
  }

  async function handleSubmit(values) {
    try {
      if (editingHabit) {
        await update(editingHabit.id, values)
        toast.success('Saved.')
      } else {
        await create(values)
        toast.success('Nice! Habit added.')
      }
      setFormOpen(false)
      setEditingHabit(null)
    } catch (caught) {
      // Dialog stays open so the entered values are not lost.
      toast.error(friendlyDataError(caught))
    }
  }

  async function handleDelete() {
    try {
      await remove(deletingHabit.id)
      toast.success('Habit deleted.')
      setDeletingHabit(null)
    } catch (caught) {
      toast.error(friendlyDataError(caught))
    }
  }

  async function handleToggle(habit, completed) {
    try {
      await toggleToday(habit, completed)
      if (completed) {
        toast.success(CHEERS[Math.floor(Math.random() * CHEERS.length)])
      }
    } catch (caught) {
      toast.error(friendlyDataError(caught))
    }
  }

  const activeCount = habits.filter((habit) => habit.is_active).length
  const doneCount = habits.filter(
    (habit) => habit.is_active && doneToday.has(habit.id)
  ).length

  function renderBody() {
    if (status === 'loading') return <HabitListSkeleton />

    if (status === 'error') {
      return (
        <ErrorState
          title="Could not load your habits"
          description={friendlyDataError(error)}
          onRetry={refresh}
        />
      )
    }

    if (habits.length === 0) {
      return (
        <EmptyState
          emoji="🌱"
          title="No habits yet"
          description="Start your first one — small and daily beats big and rare."
          action={
            <Button variant="brand" size="touch" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Add a habit
            </Button>
          }
        />
      )
    }

    return (
      <ul className="space-y-4">
        {habits.map((habit) => (
          <li key={habit.id}>
            <HabitCard
              habit={habit}
              completed={doneToday.has(habit.id)}
              streak={streaks.get(habit.id) ?? 0}
              pending={busyHabitIds.has(habit.id)}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={setDeletingHabit}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <AppShell actions={<UserMenu />}>
      <PageHeader
        title="Today"
        description={
          status === 'ready' && activeCount > 0
            ? `${doneCount} of ${activeCount} done.`
            : 'One day at a time.'
        }
        action={
          <Button variant="brand" size="touch" onClick={openCreate}>
            <Plus aria-hidden="true" />
            New habit
          </Button>
        }
      />

      {renderBody()}

      <HabitFormDialog
        open={formOpen}
        habit={editingHabit}
        saving={saving}
        onSubmit={handleSubmit}
        onOpenChange={(next) => {
          setFormOpen(next)
          if (!next) setEditingHabit(null)
        }}
      />

      <DeleteHabitDialog
        habit={deletingHabit}
        saving={saving}
        onConfirm={handleDelete}
        onOpenChange={(next) => {
          if (!next) setDeletingHabit(null)
        }}
      />
    </AppShell>
  )
}
