import { Link } from 'react-router-dom'

import { AuthCard } from '@/components/app/AuthCard'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <AuthCard
      title="Nothing here"
      description="That page does not exist — or it moved."
    >
      <Button asChild variant="brand" size="touch" className="w-full">
        <Link to="/">Back to your habits</Link>
      </Button>
    </AuthCard>
  )
}
