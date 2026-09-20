import { AppShell } from '@/components/app/AppShell'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { UserMenu } from '@/components/app/UserMenu'
import { useAuth } from '@/hooks/useAuth'

/**
 * The signed-in home screen.
 *
 * Phase D leaves it deliberately empty — reaching this page at all is the
 * thing being proved here. Phase E replaces the placeholder with the real
 * habit list, once supabase/schema.sql and your policies have been run.
 */
export function TrackerPage() {
  const { user } = useAuth()

  return (
    <AppShell actions={<UserMenu />}>
      <PageHeader
        title="Today"
        description={`Signed in as ${user?.email ?? 'your account'}.`}
      />

      <EmptyState
        emoji="🌱"
        title="No habits yet"
        description="Habit tracking arrives in Phase E. For now, the fact that you can read this means auth is working."
      />
    </AppShell>
  )
}
