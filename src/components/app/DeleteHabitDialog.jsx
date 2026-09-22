import { Loader2 } from 'lucide-react'

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

/**
 * Delete confirmation.
 *
 * It names the habit and says out loud that the logs go too — that is not
 * padding. `on delete cascade` in schema.sql means removing a habit silently
 * takes its entire history with it, and a streak someone has been building for
 * weeks is the part they would actually miss.
 */
export function DeleteHabitDialog({ habit, saving, onConfirm, onOpenChange }) {
  return (
    <AlertDialog open={Boolean(habit)} onOpenChange={onOpenChange}>
      {/* The generated max-w-xs is exactly 320px — edge to edge on an
          iPhone SE. Below sm, keep a 1rem gutter each side instead. */}
      <AlertDialogContent className="max-sm:max-w-[calc(100%-2rem)]!">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{habit?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This also deletes every day you logged for it, including the
            streak. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="quiet" size="touch" disabled={saving}>
              Keep it
            </Button>
          </AlertDialogCancel>

          {/*
            Deliberately not an AlertDialogAction: that closes the dialog on
            click, which would hide the spinner and the error if the delete
            fails. The parent closes it once the request actually succeeds.
          */}
          <Button
            variant="danger"
            size="touch"
            disabled={saving}
            onClick={onConfirm}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              'Delete habit'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
