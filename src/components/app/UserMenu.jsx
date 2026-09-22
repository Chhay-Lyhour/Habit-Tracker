import { useState } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { UserAvatar } from '@/components/app/UserAvatar'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { readQueue } from '@/lib/offlineQueue'
import { friendlyAuthError } from '@/lib/validation'

/**
 * Header account menu. Showing the signed-in email is not decoration — it is
 * how you tell at a glance which account a window belongs to when testing the
 * app with two of them side by side.
 *
 * Signing out clears the offline queue (it belongs to this session only), so
 * if habits are still waiting to sync it asks first rather than dropping them
 * silently.
 */
export function UserMenu() {
  const { user, signOut } = useAuth()
  const { profile, status } = useProfile()
  const [pending, setPending] = useState(false)
  const [unsyncedCount, setUnsyncedCount] = useState(0)

  async function handleSignOut() {
    setPending(true)
    try {
      await signOut()
      // No redirect needed: the session drops, ProtectedRoute notices and
      // sends us to /login on the next render.
    } catch (error) {
      toast.error(friendlyAuthError(error))
      setPending(false)
    }
  }

  return (
    <>
      {/* modal={false}: a modal menu closing at the same moment the confirm
          dialog opens can leave pointer-events stuck off on <body>. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="quiet"
            size="touch-icon"
            aria-label="Account menu"
            className="p-0"
          >
            <UserAvatar
              src={profile?.avatar_url}
              email={user?.email}
              loading={status === 'loading'}
              className="size-10"
              fallbackClassName="text-sm"
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {user?.email}
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* asChild: a real link, so /profile can be opened in a new tab
              and the router handles it without a reload. */}
          <DropdownMenuItem asChild className="min-h-12 text-base">
            <Link to="/profile">
              <UserRound aria-hidden="true" />
              Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="min-h-12 text-base"
            variant="destructive"
            disabled={pending}
            onSelect={(event) => {
              const count = readQueue(user?.id).length
              if (count > 0) {
                // Let the menu close; the confirm dialog takes over.
                setUnsyncedCount(count)
                return
              }
              // Keep the menu open while the request is in flight so the
              // disabled state is visible rather than flashing past.
              event.preventDefault()
              handleSignOut()
            }}
          >
            <LogOut aria-hidden="true" />
            {pending ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={unsyncedCount > 0}
        onOpenChange={(open) => {
          if (!open) setUnsyncedCount(0)
        }}
      >
        <AlertDialogContent className="max-sm:max-w-[calc(100%-2rem)]!">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {unsyncedCount === 1
                ? '1 habit hasn’t synced yet'
                : `${unsyncedCount} habits haven’t synced yet`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unsyncedCount === 1 ? 'It was' : 'They were'} added while you
              were offline. Signing out now discards{' '}
              {unsyncedCount === 1 ? 'it' : 'them'}. Stay signed in and{' '}
              {unsyncedCount === 1 ? 'it' : 'they'} will sync when you’re back
              online.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="quiet" size="touch" disabled={pending}>
                Stay signed in
              </Button>
            </AlertDialogCancel>
            <Button
              variant="danger"
              size="touch"
              disabled={pending}
              onClick={handleSignOut}
            >
              {pending ? 'Signing out…' : 'Sign out anyway'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
