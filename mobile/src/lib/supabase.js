import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

/**
 * The native twin of the web app's src/lib/supabase.js — and the fix for
 * leaks 1 and 2 in docs/platform-audit.md.
 *
 * The web app's `@shared/habits` imports `@/lib/supabase`. In this project
 * `@/` points at mobile/src, so that shared file gets THIS client, while the
 * web build still gets the browser one. Same queries, different plumbing.
 */

// Expo inlines EXPO_PUBLIC_* at build time, and only for static
// `process.env.NAME` reads — no destructuring. Public values only: anon key.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  const missing = [
    !url && 'EXPO_PUBLIC_SUPABASE_URL',
    !anonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean)

  throw new Error(
    `Supabase is not configured — missing ${missing.join(' and ')}.\n\n` +
      'Copy mobile/.env.example to mobile/.env, fill it in, then restart ' +
      '`npx expo start` (env is read at startup).'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // The browser gives supabase-js localStorage for free; native has none,
    // so without this the session is forgotten on every app restart.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // There is no URL bar to read a login redirect from.
    detectSessionInUrl: false,
  },
})

// A backgrounded app cannot run timers, so refresh the token only while the
// app is in the foreground — Supabase's recommended setup for React Native.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
