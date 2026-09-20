import { useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { AuthCard } from '@/components/app/AuthCard'
import { FormField } from '@/components/app/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import {
  MIN_PASSWORD_LENGTH,
  friendlyAuthError,
  validateEmail,
  validatePassword,
} from '@/lib/validation'

export function SignupPage() {
  const { signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setPending(true)

    try {
      const { needsEmailConfirmation } = await signUp({
        email: email.trim(),
        password,
      })

      if (needsEmailConfirmation) {
        // No session came back, so nothing will redirect us. Swap the form for
        // an explanation instead of leaving them on a form that looks like it
        // did nothing.
        setAwaitingConfirmation(true)
        setPending(false)
        return
      }

      toast.success('Account created. Welcome aboard!')
      // A session exists, so PublicOnlyRoute takes it from here.
    } catch (error) {
      const message = friendlyAuthError(error)
      setErrors({ form: message })
      toast.error(message)
      setPending(false)
    }
  }

  if (awaitingConfirmation) {
    return (
      <AuthCard
        title="Check your inbox"
        description="One more step and you're in."
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <MailCheck className="size-12 text-grass" aria-hidden="true" />

          <p className="text-base">
            We sent a confirmation link to{' '}
            <span className="font-bold break-all">{email.trim()}</span>. Click
            it, then come back and sign in.
          </p>

          <p className="text-sm text-muted-foreground">
            Nothing there? Check your spam folder — it sometimes lands there.
          </p>

          <Button asChild variant="brand" size="touch" className="mt-2 w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Start your streak"
      description="One habit today beats three next week."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-sky underline-offset-4 hover:underline"
          >
            Sign in
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

        <FormField
          id="password"
          label="Password"
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'password-error' : 'password-hint'
            }
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
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
