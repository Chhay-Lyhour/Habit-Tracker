/**
 * Title block for a screen. `action` holds the single primary action the
 * design rules allow per screen.
 */
export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-base text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
