/**
 * Client-side validation for the auth forms. It exists to give fast, friendly
 * feedback — Supabase re-validates everything server-side, so this is never
 * the thing keeping bad data out.
 */

// Deliberately loose. Anything stricter starts rejecting addresses that are
// perfectly valid; the confirmation email is the real test.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MIN_PASSWORD_LENGTH = 6

export function validateEmail(value) {
  const email = value.trim()
  if (!email) return 'Enter your email address.'
  if (!EMAIL_SHAPE.test(email)) return "That doesn't look like an email address."
  return null
}

export function validatePassword(value) {
  if (!value) return 'Enter a password.'
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}

/**
 * Supabase's errors are accurate but terse. These are the ones a user can
 * actually act on; anything unrecognised falls through unchanged rather than
 * being hidden behind a vague catch-all.
 */
export function friendlyAuthError(error) {
  const message = error?.message ?? ''

  if (/invalid login credentials/i.test(message)) {
    return "That email and password don't match. Try again?"
  }
  if (/email not confirmed/i.test(message)) {
    return 'Check your inbox — you need to confirm your email before signing in.'
  }
  if (/user already registered|already been registered/i.test(message)) {
    return 'There is already an account with that email. Try signing in.'
  }
  if (/password should be at least/i.test(message)) {
    return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many attempts. Give it a minute and try again.'
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  return message || 'Something went wrong. Try again.'
}
