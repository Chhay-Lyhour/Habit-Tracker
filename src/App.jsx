import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/AuthProvider'
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
        <Routes>
          {/* Signed out only — a signed-in visitor gets sent to the tracker. */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Signed in only — everything else redirects to /login. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TrackerPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  )
}
