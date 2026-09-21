import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * All profile + avatar data access lives here. Nothing else in the app talks
 * to the profiles table or the avatars bucket.
 *
 * Neither function takes a user id from its caller. Both read it from the
 * current session, so no component — and no crafted input — can point an
 * upload at someone else's folder or a query at someone else's row. The
 * storage policies would refuse it anyway; the code should not even ask.
 *
 * Loading and error state for these calls lives in ProfileProvider (exposed
 * through useProfile), the same split as habits.js / useHabits.
 * ============================================================================
 */

export const AVATAR_BUCKET = 'avatars'

const PROFILE_FIELDS = 'id, avatar_url, updated_at'

/** The signed-in user's id, from the locally stored session (no request). */
async function sessionUserId() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  const userId = data.session?.user?.id
  if (!userId) {
    const notSignedIn = new Error('You are signed out. Sign in and try again.')
    notSignedIn.code = 'NOT_SIGNED_IN'
    throw notSignedIn
  }
  return userId
}

/**
 * Turns Postgres and Storage errors into something a person can act on.
 * Storage errors carry an HTTP-ish statusCode and a message rather than a
 * Postgres code, so both are checked.
 */
export function friendlyProfileError(error) {
  const message = error?.message?.toLowerCase() ?? ''
  const status = String(error?.statusCode ?? error?.status ?? '')

  if (error?.code === 'NOT_SIGNED_IN') return error.message
  if (error?.code === '42501' || message.includes('row-level security')) {
    return 'The server refused that. Check the profiles policies and supabase/storage.sql have been run.'
  }
  if (error?.code === 'PGRST116') {
    return 'Your profile row is missing. Run the backfill in supabase/schema_v2.sql.'
  }
  if (error?.code === '21000') {
    return 'That update has no filter. Fill in the HAND-WRITE marker in src/lib/profile.js.'
  }
  if (error?.code === 'PGRST205') {
    return 'The profiles table is missing. Run supabase/schema_v2.sql in the SQL editor.'
  }
  if (status === '413' || message.includes('maximum allowed size')) {
    return 'That image is over 1 MB. Try a smaller one.'
  }
  if (status === '415' || message.includes('mime type')) {
    return 'Please choose a JPG, PNG or WebP image.'
  }
  if (message.includes('bucket not found')) {
    return 'The avatars bucket is missing. Run supabase/storage.sql.'
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return 'Something went wrong. Try again.'
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * The signed-in user's profile, or null if there is no row (yet).
 *
 * maybeSingle, not single: "no row" is an empty state, not an error. It is
 * also exactly what you get while RLS is on and the policies are not yet run.
 */
export async function getProfile() {
  const userId = await sessionUserId()

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    // Scope the read to your own row. RLS already limits SELECT to it, so
    // missing this is harmless — but the query should say what it means.
    .maybeSingle()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Upload (or replace) the signed-in user's avatar and record its URL.
 *
 * Call validateAvatar first — this function trusts it has run. The server
 * still enforces size and MIME type through the bucket settings.
 *
 * Path is `<uid>/avatar`: fixed name, no extension. With upsert: true, every
 * upload overwrites the same object, so switching png → jpg still leaves
 * exactly one file. That is also why contentType is passed explicitly —
 * Storage cannot guess it from an extension that is not there.
 *
 * The public URL never changes, so browsers and the CDN would keep showing
 * the old image. The `?v=<timestamp>` makes each upload a new URL.
 */
export async function uploadAvatar(file) {
  const userId = await sessionUserId()
  const path = `${userId}/avatar`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    })

  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const avatarUrl = `${publicUrl}?v=${Date.now()}`

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    // Must target your own row. RLS limits it to your row too, but an
    // unfiltered UPDATE is refused outright by Supabase (code 21000), and the
    // query should state its target rather than lean on either.
    .select(PROFILE_FIELDS)
    .single()

  if (error) throw error
  return data
}
