import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { AuthCard } from '@/components/app/AuthCard'
import { FormField } from '@/components/app/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
// Sign-in deliberately does not apply the minimum-length rule: the account
// either exists with that password or it does not, and enforcing it here would
// only reject people whose password predates the rule.
import { friendlyAuthError, validateEmail } from '@/lib/validation'

export function LoginPage() {
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {
      email: validateEmail(email),
      password: password ? null : 'Enter your password.',
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setPending(true)

    try {
      await signIn({ email: email.trim(), password })
      // On success the session updates and PublicOnlyRoute redirects. Leaving
      // `pending` true keeps the button disabled through that last frame.
    } catch (error) {
      const message = friendlyAuthError(error)
      setErrors({ form: message })
      toast.error(message)
      setPending(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Pick up your streak where you left off."
      footer={
        <>
          New here?{' '}
          <Link
            to="/signup"
            className="font-bold text-sky underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField id="email" label="Email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </FormField>

        <FormField id="password" label="Password" error={errors.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
        </FormField>

        {errors.form ? (
          <p
            role="alert"
            className="rounded-control bg-danger/10 px-4 py-3 text-sm font-bold text-danger"
          >
            {errors.form}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="brand"
          size="touch"
          className="w-full"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
