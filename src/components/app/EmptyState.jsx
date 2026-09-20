/**
 * Shown when a query succeeded but returned nothing. An empty list is a
 * normal state, not a failure — the copy stays encouraging.
 */
export function EmptyState({ emoji = '🌱', title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border-2 border-dashed border-border bg-card px-6 py-14 text-center">
      <span
        className="grid size-20 place-items-center rounded-full bg-accent text-4xl"
        role="img"
        aria-label=""
      >
        {emoji}
      </span>

      <div className="space-y-1.5">
        <h2 className="font-heading text-xl font-extrabold">{title}</h2>
        {description ? (
          <p className="mx-auto max-w-sm text-base text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}
