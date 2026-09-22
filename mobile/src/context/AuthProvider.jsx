import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

/**
 * Same shape as the web AuthProvider: the session from getSession() on mount,
 * onAuthStateChange afterwards, and `loading` true until the first answer —
 * nothing may redirect while it is true, or a signed-in user gets bounced to
 * the login screen on every launch.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      /**
       * The web signUp uses window.location.origin (audit leak 4). Native has
       * no origin, so the confirmation link goes to the deployed web app's
       * /login: the email gets confirmed there, then the user signs in here.
       * With confirmation on, there is a user but no session yet — the
       * caller shows "check your inbox", exactly like the web page.
       */
      signUp: async (email, password) => {
        const appUrl = process.env.EXPO_PUBLIC_APP_URL
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: appUrl ? { emailRedirectTo: `${appUrl.replace(/\/$/, '')}/login` } : undefined,
        })
        return { error, needsEmailConfirmation: !error && data.session === null }
      },
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
