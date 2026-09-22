import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { ErrorBoundary } from '@/components/app/ErrorBoundary'
import { SectionFallback } from '@/components/app/SectionFallback'
import { TrackerSkeleton } from '@/components/app/TrackerSkeleton'
import { UpdateToast } from '@/components/app/UpdateToast'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/AuthProvider'
import { ProfileProvider } from '@/context/ProfileProvider'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'

// Each page is its own chunk, so /login does not download the tracker (and
// its dialogs, avatar upload and offline queue) before it can paint. The
// service worker precaches every chunk after the first visit, so later
// navigations are instant and work offline.
const named = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })))
const loadTracker = () => import('@/pages/TrackerPage')
const LoginPage = named(() => import('@/pages/LoginPage'), 'LoginPage')
const SignupPage = named(() => import('@/pages/SignupPage'), 'SignupPage')
const TrackerPage = named(loadTracker, 'TrackerPage')
const NotFoundPage = named(() => import('@/pages/NotFoundPage'), 'NotFoundPage')

// Opening the tracker directly: start its chunk now, in parallel with reading
// the session, instead of only once ProtectedRoute lets it render. The import
// is cached, so lazy() reuses this same request.
if (window.location.pathname === '/') loadTracker()

/** Plain background while an auth page's chunk loads — no layout to jump. */
function BlankPage() {
  return <div className="min-h-dvh bg-background" aria-busy="true" />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/*
          Last resort only. Each section of the tracker has its own boundary,
          so this catches what escapes them — a crash in a page's own render,
          or in a section fallback.
        */}
        <ErrorBoundary
          name="app"
          fallback={({ reset }) => (
            <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
              <SectionFallback
                emoji="😵"
                title="Well, that wasn’t supposed to happen."
                description="Your habits are saved. Give it another go."
                onRetry={reset}
                className="w-full"
              />
            </div>
          )}
        >
          <Routes>
            {/* Signed out only — a signed-in visitor gets sent to the tracker. */}
            <Route element={<PublicOnlyRoute />}>
              <Route
                path="/login"
                element={
                  <Suspense fallback={<BlankPage />}>
                    <LoginPage />
                  </Suspense>
                }
              />
              <Route
                path="/signup"
                element={
                  <Suspense fallback={<BlankPage />}>
                    <SignupPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Signed in only — everything else redirects to /login. */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/"
                element={
                  // Inside the protected route, so the profile only loads for
                  // a signed-in user and is dropped on sign-out. The fallback
                  // is the same skeleton ProtectedRoute shows, so the hand-off
                  // from "reading session" to "loading chunk" is invisible.
                  <ProfileProvider>
                    <Suspense fallback={<TrackerSkeleton />}>
                      <TrackerPage />
                    </Suspense>
                  </ProfileProvider>
                }
              />
            </Route>

            <Route
              path="*"
              element={
                <Suspense fallback={<BlankPage />}>
                  <NotFoundPage />
                </Suspense>
              }
            />
          </Routes>
        </ErrorBoundary>

        <Toaster position="top-center" richColors />
        {/* Outside every ErrorBoundary: a crashed section must not stop the
            user from picking up the update that fixes it. */}
        <UpdateToast />
      </AuthProvider>
    </BrowserRouter>
  )
}
