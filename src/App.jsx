import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BrowserRouter } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell } from '@/components/app/AppShell'
import { EmptyState } from '@/components/app/EmptyState'
import { ErrorState } from '@/components/app/ErrorState'
import { HabitCard } from '@/components/app/HabitCard'
import { HabitListSkeleton } from '@/components/app/HabitListSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

/**
 * Phase B preview. This is a static gallery of the design system so the look
 * can be checked in the browser — Phase D replaces it with the real router.
 */
const DEMO_HABITS = [
  {
    id: 'demo-1',
    title: 'Read 20 pages',
    description: 'Any book counts',
    is_active: true,
  },
  {
    id: 'demo-2',
    title: 'Morning run',
    description: '2km around the block',
    is_active: true,
  },
  {
    id: 'demo-3',
    title: 'Practice guitar',
    description: null,
    is_active: false,
  },
]

function Section({ title, children }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Preview() {
  const [done, setDone] = useState({ 'demo-2': true })

  function handleToggle(habit, next) {
    setDone((prev) => ({ ...prev, [habit.id]: next }))
    if (next) toast.success('Nice! One more day on the board.')
  }

  return (
    <AppShell
      actions={
        <Button variant="quiet" size="touch">
          Sign out
        </Button>
      }
    >
      <PageHeader
        title="Today"
        description="Three habits, one day at a time."
        action={
          <Button variant="brand" size="touch">
            <Plus aria-hidden="true" />
            New habit
          </Button>
        }
      />

      <Section title="Habit list">
        <ul className="space-y-4">
          {DEMO_HABITS.map((habit, i) => (
            <li key={habit.id}>
              <HabitCard
                habit={habit}
                completed={Boolean(done[habit.id])}
                streak={[0, 12, 3][i]}
                onToggle={handleToggle}
                onEdit={() => toast('Edit lands in Phase E.')}
                onDelete={() => toast('Delete lands in Phase E.')}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Loading state">
        <HabitListSkeleton rows={2} />
      </Section>

      <Section title="Empty state">
        <EmptyState
          title="No habits yet"
          description="Start your first one — small and daily beats big and rare."
          action={
            <Button variant="brand" size="touch">
              <Plus aria-hidden="true" />
              Add a habit
            </Button>
          }
        />
      </Section>

      <Section title="Error state">
        <ErrorState onRetry={() => toast('Retrying…')} />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="brand" size="touch">
            Primary
          </Button>
          <Button variant="sky" size="touch">
            Secondary
          </Button>
          <Button variant="danger" size="touch">
            Danger
          </Button>
          <Button variant="quiet" size="touch">
            Quiet
          </Button>
          <Button variant="brand" size="touch" disabled>
            Disabled
          </Button>
        </div>
      </Section>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Preview />
      <Toaster />
    </BrowserRouter>
  )
}
