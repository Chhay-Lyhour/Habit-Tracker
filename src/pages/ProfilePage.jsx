import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppShell } from '@/components/app/AppShell'
import { AvatarUploader } from '@/components/app/AvatarUploader'
import { ErrorBoundary } from '@/components/app/ErrorBoundary'
import { PageHeader } from '@/components/app/PageHeader'
import { SectionFallback } from '@/components/app/SectionFallback'
import { ShareButton } from '@/components/app/ShareButton'
import { UserMenu } from '@/components/app/UserMenu'
import { Button } from '@/components/ui/button'

/**
 * The profile on its own route, matching the Expo app's profile screen. The
 * tracker opens straight onto today's habits; the photo is one tap away in
 * the account menu.
 *
 * Profile state comes from the ProfileProvider mounted above both this page
 * and the tracker (App.jsx), so the header avatar and the uploader still
 * share one profile — a new photo shows in both at once.
 */
export function ProfilePage() {
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
        title="Profile"
        description="Your photo shows in the header and across your devices."
        action={
          <Button asChild variant="quiet" size="touch">
            <Link to="/">
              <ArrowLeft aria-hidden="true" />
              Back to habits
            </Link>
          </Button>
        }
      />

      <section aria-label="Your profile">
        {/* Boundaries only catch render errors — AvatarUploader still does
            its own try/catch around the upload. */}
        <ErrorBoundary
          name="avatar"
          fallback={({ reset }) => (
            <SectionFallback label="Your profile" emoji="🖼️" onRetry={reset} />
          )}
        >
          <AvatarUploader />
        </ErrorBoundary>
      </section>
    </AppShell>
  )
}
