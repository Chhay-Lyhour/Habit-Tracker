import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { ErrorBoundary } from '@/components/app/ErrorBoundary'
import { SectionFallback } from '@/components/app/SectionFallback'
import { UpdateToast } from '@/components/app/UpdateToast'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/AuthProvider'
import { ProfileProvider } from '@/context/ProfileProvider'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SignupPage } from '@/pages/SignupPage'
import { TrackerPage } from '@/pages/TrackerPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'

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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Signed in only — everything else redirects to /login. */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/"
                element={
                  // Inside the protected route, so the profile only loads for
                  // a signed-in user and is dropped on sign-out.
                  <ProfileProvider>
                    <TrackerPage />
                  </ProfileProvider>
                }
              />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
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
