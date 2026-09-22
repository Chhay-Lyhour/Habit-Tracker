import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { AppShell } from '@/components/app/AppShell'
import { DeleteHabitDialog } from '@/components/app/DeleteHabitDialog'
import { EmptyState } from '@/components/app/EmptyState'
import { ErrorBoundary } from '@/components/app/ErrorBoundary'
import { ErrorState } from '@/components/app/ErrorState'
import { HabitCard } from '@/components/app/HabitCard'
import { HabitFormDialog } from '@/components/app/HabitFormDialog'
import { HabitListSkeleton } from '@/components/app/HabitListSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { QueuedHabitCard } from '@/components/app/QueuedHabitCard'
import { SectionFallback } from '@/components/app/SectionFallback'
import { ShareButton } from '@/components/app/ShareButton'
import { StatsSection } from '@/components/app/StatsSection'
import { UserMenu } from '@/components/app/UserMenu'
import { Button } from '@/components/ui/button'
import { useHabits } from '@/hooks/useHabits'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { friendlyDataError } from '@/lib/habits'

const CHEERS = [
  'Nice! One more day on the board.',
  'That’s the streak alive.',
  'Done. See you tomorrow.',
  'Another one down.',
]

function handleQueueSynced({ synced, failed }) {
  if (synced > 0) {
    toast.success(
      `Back online. Synced ${synced} ${synced === 1 ? 'habit' : 'habits'}.`
    )
  }
  if (failed > 0) {
    toast.error(
      `${failed} queued ${failed === 1 ? 'habit' : 'habits'} didn’t sync. Tap Retry on ${failed === 1 ? 'it' : 'them'}.`
    )
  }
}

export function TrackerPage() {
  const {
    habits,
    doneToday,
    streaks,
    status,
    error,
    saving,
    busyHabitIds,
    queued,
    refresh,
    toggleToday,
    create,
    update,
    remove,
    syncNow,
    discard,
  } = useHabits({ onQueueSynced: handleQueueSynced })

  // Only creating works offline (it queues). Everything that needs the server
  // right now is disabled while the browser reports offline — and if it lies
  // (online, but no real connection), the request fails and friendlyDataError
  // says "You're offline" instead.
  const online = useOnlineStatus()

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
        const { queued: wasQueued } = await create(values)
        if (wasQueued) {
          toast('Saved offline, will sync when you’re back online.', {
            icon: '🕒',
          })
        } else {
          toast.success('Nice! Habit added.')
        }
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

  function handleDiscard(itemId) {
    discard(itemId)
    toast('Queued habit discarded.')
  }

  const queuedList =
    queued.length > 0 ? (
      <ul className="space-y-4" aria-label="Waiting to sync">
        {queued.map((item) => (
          <li key={item.id}>
            <QueuedHabitCard
              item={item}
              offline={!online}
              onRetry={syncNow}
              onDiscard={handleDiscard}
            />
          </li>
        ))}
      </ul>
    ) : null

  function renderBody() {
    if (status === 'loading') return <HabitListSkeleton />

    if (status === 'error') {
      // Queued habits live in localStorage, so they can still be shown when
      // the list itself failed to load (typically: opened offline).
      return (
        <div className="space-y-4">
          <ErrorState
            title="Could not load your habits"
            description={friendlyDataError(error)}
            onRetry={refresh}
          />
          {queuedList}
        </div>
      )
    }

    if (habits.length === 0 && queued.length === 0) {
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
      <div className="space-y-4">
        {habits.length > 0 ? (
          <ul className="space-y-4">
            {habits.map((habit) => (
              <li key={habit.id}>
                <HabitCard
                  habit={habit}
                  completed={doneToday.has(habit.id)}
                  streak={streaks.get(habit.id) ?? 0}
                  pending={busyHabitIds.has(habit.id)}
                  offline={!online}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setDeletingHabit}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {queuedList}
      </div>
    )
  }

  return (
    <AppShell
      actions={
        <>
          <ShareButton />
          <UserMenu />
        </>
      }
    >
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

      {/*
        One boundary per section, so a render crash in one leaves the others
        working. Boundaries only catch errors thrown while rendering — the
        async handlers above still need their own try/catch + toast.
        resetKeys: a successful refetch hands the section fresh data, so an
        errored section gets another go without a click.
      */}
      <section aria-label="Your stats" className="mb-8">
        <ErrorBoundary
          name="stats"
          resetKeys={[habits, doneToday]}
          fallback={({ reset }) => (
            <SectionFallback label="Your stats" emoji="📊" onRetry={reset} />
          )}
        >
          <StatsSection
            status={status}
            habits={habits}
            doneToday={doneToday}
            streaks={streaks}
          />
        </ErrorBoundary>
      </section>

      <section aria-label="Your habits">
        <ErrorBoundary
          name="habits"
          resetKeys={[habits, queued]}
          fallback={({ reset }) => (
            <SectionFallback label="Your habits" emoji="🌱" onRetry={reset} />
          )}
        >
          {renderBody()}
        </ErrorBoundary>
      </section>

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
