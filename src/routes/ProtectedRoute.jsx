import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { TrackerSkeleton } from '@/components/app/TrackerSkeleton'
import { useAuth } from '@/hooks/useAuth'

/**
 * Gate for signed-in screens.
 *
 * While the session is still being read we render the skeleton rather than
 * deciding — redirecting on an unknown session would throw a signed-in user
 * out on every refresh.
 *
 * `replace` keeps /login out of the history stack, so Back does not land on
 * the page we just redirected away from.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <TrackerSkeleton />

  if (!session) {
    // Remember where they were headed so the login form can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
