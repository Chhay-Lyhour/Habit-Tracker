import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { FormField } from '@/components/app/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const MAX_TITLE = 80
const MAX_DESCRIPTION = 280

/**
 * The form itself, deliberately split out.
 *
 * Radix unmounts DialogContent when the dialog closes, so this component is
 * created fresh on every open and its useState initialisers read the current
 * habit directly. That is why there is no effect syncing props into state — a
 * cancelled edit cannot leak into the next one because the state does not
 * survive the close.
 */
function HabitForm({ habit, saving, onSubmit, onCancel }) {
  const editing = Boolean(habit)

  const [title, setTitle] = useState(habit?.title ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [isActive, setIsActive] = useState(habit?.is_active ?? true)
  const [errors, setErrors] = useState({})

  function handleSubmit(event) {
    event.preventDefault()

    const trimmed = title.trim()
    const nextErrors = {}

    // These limits match the check constraints in schema.sql. Catching them
    // here turns a database error into a sentence the user can act on.
    if (!trimmed) nextErrors.title = 'Give your habit a name.'
    else if (trimmed.length > MAX_TITLE) {
      nextErrors.title = `Keep it under ${MAX_TITLE} characters.`
    }
    if (description.trim().length > MAX_DESCRIPTION) {
      nextErrors.description = `Keep it under ${MAX_DESCRIPTION} characters.`
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSubmit({
      title: trimmed,
      description: description.trim() || null,
      ...(editing ? { is_active: isActive } : {}),
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit habit' : 'New habit'}</DialogTitle>
        <DialogDescription>
          {editing
            ? 'Change the name, the note, or pause it for a while.'
            : 'Small and daily beats big and rare.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField id="habit-title" label="Name" error={errors.title}>
          <Input
            id="habit-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Read 20 pages"
            maxLength={MAX_TITLE}
            disabled={saving}
            autoFocus
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'habit-title-error' : undefined}
          />
        </FormField>

        <FormField
          id="habit-description"
          label="Note"
          error={errors.description}
          hint="Optional — a reminder of what counts."
        >
          <Input
            id="habit-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Any book counts"
            maxLength={MAX_DESCRIPTION}
            disabled={saving}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description
                ? 'habit-description-error'
                : 'habit-description-hint'
            }
          />
        </FormField>

        {editing ? (
          <div className="flex items-center justify-between gap-4 rounded-control border-2 border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="habit-active" className="text-sm font-bold">
                Active
              </Label>
              <p className="text-sm text-muted-foreground">
                Paused habits stay in your history but stop asking.
              </p>
            </div>

            <Switch
              id="habit-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={saving}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="quiet"
            size="touch"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button type="submit" variant="brand" size="touch" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : editing ? (
              'Save changes'
            ) : (
              'Add habit'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

/** One dialog for both creating and editing — `habit` being null means create. */
export function HabitFormDialog({ open, habit, saving, onSubmit, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <HabitForm
          // Insurance: if the dialog ever switched habits while staying open,
          // the key forces a remount rather than showing the previous values.
          key={habit?.id ?? 'new'}
          habit={habit}
          saving={saving}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
