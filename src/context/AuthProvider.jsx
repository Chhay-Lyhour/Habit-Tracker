import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { AuthContext } from '@/context/auth-context'

/**
 * Owns the session for the whole app.
 *
 * Two sources feed it: getSession() answers "is someone already signed in?" on
 * first paint (the session lives in localStorage, so a refresh keeps it), and
 * onAuthStateChange keeps it current afterwards — sign in, sign out, token
 * refresh, and changes made in another tab.
 *
 * `loading` stays true until the first answer arrives. Without it the app
 * would render as signed-out for a frame and bounce the user to /login before
 * the stored session had been read — the redirect flicker.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Guards against setting state after unmount if the request is still in
    // flight — React 18 StrictMode mounts effects twice in development.
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setLoading(false)
      })
      .catch(() => {
        // A failure here means "we could not determine a session", which for
        // our purposes is the same as not having one. ProtectedRoute sends
        // them to /login and the form reports anything that goes wrong there.
        if (!active) return
        setSession(null)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })

    if (error) throw error

    // With "Confirm email" switched on in Supabase, signUp returns a user but
    // no session — nothing is signed in until they click the link. The caller
    // needs to tell them that rather than waiting for a redirect that will
    // never come.
    return { needsEmailConfirmation: data.session === null }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, signIn, signUp, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
