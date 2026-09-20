import { useState } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { toast } from 'sonner'

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
import { friendlyAuthError } from '@/lib/validation'

/**
 * Header account menu. Showing the signed-in email is not decoration — it is
 * how you tell at a glance which account a window belongs to when testing the
 * app with two of them side by side.
 */
export function UserMenu() {
  const { user, signOut } = useAuth()
  const [pending, setPending] = useState(false)

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" size="touch-icon" aria-label="Account menu">
          <UserRound aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {user?.email}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={(event) => {
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
  )
}
