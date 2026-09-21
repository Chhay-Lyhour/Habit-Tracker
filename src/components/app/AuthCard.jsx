import { Flame } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

/** Centred single-column frame shared by the login and signup screens. */
export function AuthCard({ title, description, children, footer }) {
  return (
    <div className="safe-x safe-bottom flex min-h-dvh flex-col items-center justify-center bg-background pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Flame className="size-12 text-streak-bright" aria-hidden="true" />
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="text-base text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <Card>
          <CardContent>{children}</CardContent>
        </Card>

        {footer ? (
          <div className="mt-6 text-center text-base text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
