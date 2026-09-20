import { Label } from '@/components/ui/label'

/**
 * Label + control + one line of feedback.
 *
 * The error and hint ids are stable and derived from the field id, so the
 * control can point at them with aria-describedby. An error takes the slot
 * when present, and carries role="alert" so it is announced when it appears.
 */
export function FormField({ id, label, error, hint, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold">
        {label}
      </Label>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm font-bold text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
