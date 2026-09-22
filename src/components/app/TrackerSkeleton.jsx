import { AppShell } from '@/components/app/AppShell'
import { HabitListSkeleton } from '@/components/app/HabitListSkeleton'
import { PageHeader } from '@/components/app/PageHeader'

/**
 * The tracker's loading frame. Shown by ProtectedRoute while the session is
 * read, and by App's Suspense while the TrackerPage chunk downloads — the
 * same frame both times, so the hand-off is seamless.
 */
export function TrackerSkeleton() {
  return (
    <AppShell>
      <PageHeader title="Today" />
      <HabitListSkeleton />
    </AppShell>
  )
}
