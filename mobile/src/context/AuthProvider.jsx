import * as Linking from 'expo-linking'
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
       * no origin, so the confirmation link points back INTO the app:
       * Linking.createURL gives `exp://<your-mac>:8081/--/auth-callback` in
       * Expo Go and `habittracker://auth-callback` in a real build. Tapping
       * the link on the phone opens src/app/auth-callback.jsx, which signs
       * the user in. Both URLs must be allow-listed in Supabase (Redirect
       * URLs), or Supabase falls back to the Site URL — the web app.
       *
       * With confirmation on, there is a user but no session yet — the
       * caller shows "check your inbox", exactly like the web page.
       */
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: Linking.createURL('auth-callback') },
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
