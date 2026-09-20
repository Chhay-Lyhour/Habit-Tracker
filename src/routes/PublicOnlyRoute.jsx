import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AuthCard } from '@/components/app/AuthCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'

/**
 * The mirror of ProtectedRoute: /login and /signup are pointless once you are
 * signed in, so send those visitors to the tracker instead.
 *
 * If ProtectedRoute bounced them here from somewhere specific, it left the
 * path in location.state.from — signing in returns them there rather than
 * always dumping them on the home page.
 */
export function PublicOnlyRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <AuthCard title="Habit Tracker">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-control" />
          <Skeleton className="h-12 w-full rounded-control" />
          <Skeleton className="h-12 w-full rounded-control" />
        </div>
      </AuthCard>
    )
  }

  if (session) {
    return <Navigate to={location.state?.from ?? '/'} replace />
  }

  return <Outlet />
}
