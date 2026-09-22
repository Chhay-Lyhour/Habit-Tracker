import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { friendlyAuthError } from '@shared/validation'

import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabase'

/**
 * Where the sign-up confirmation email lands (see signUp in AuthProvider).
 *
 * Supabase verifies the email, then redirects here with the new session in
 * the URL fragment: `…/auth-callback#access_token=…&refresh_token=…`. On the
 * web, supabase-js reads that itself (detectSessionInUrl); native has no URL
 * bar, so this screen hands the tokens over with setSession. The session
 * change then flips the Stack.Protected guards and the tracker opens — no
 * navigation needed here on success.
 *
 * Tokens are never logged or shown.
 */

/** Query and fragment params, merged. Manual on purpose: RN's URLSearchParams is partial. */
function paramsFrom(url) {
  const params = {}
  const [beforeHash, hash = ''] = url.split('#')
  const query = beforeHash.split('?')[1] ?? ''
  for (const part of `${query}&${hash}`.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const key = decodeURIComponent(eq === -1 ? part : part.slice(0, eq))
    params[key] = eq === -1 ? '' : decodeURIComponent(part.slice(eq + 1).replace(/\+/g, ' '))
  }
  return params
}

export default function AuthCallbackScreen() {
  const url = Linking.useURL()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url) return
    const params = paramsFrom(url)

    // e.g. an expired or already-used link.
    if (params.error || params.error_description) {
      setError(params.error_description || 'That link didn’t work. Try signing in.')
      return
    }

    if (params.access_token && params.refresh_token) {
      supabase.auth
        .setSession({ access_token: params.access_token, refresh_token: params.refresh_token })
        .then(({ error: sessionError }) => {
          if (sessionError) setError(friendlyAuthError(sessionError))
        })
      return
    }

    setError('That link is missing its sign-in details. Sign in with your email and password.')
  }, [url])

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background p-4">
      <View className="w-full gap-4 rounded-card border-2 border-border bg-card p-6">
        {error ? (
          <>
            <Text accessibilityRole="header" className="text-center text-xl font-extrabold text-foreground">
              Couldn’t sign you in
            </Text>
            <Text accessibilityRole="alert" className="text-center text-base text-muted-foreground">
              {error}
            </Text>
            <Button label="Go to sign in" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <View className="items-center gap-3" accessibilityState={{ busy: true }}>
            <ActivityIndicator color="#428407" size="large" />
            <Text className="text-center text-base font-bold text-foreground">
              Email confirmed! Signing you in…
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
