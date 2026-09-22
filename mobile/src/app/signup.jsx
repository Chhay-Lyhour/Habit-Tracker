import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { friendlyAuthError, validateEmail, validatePassword } from '@shared/validation'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/context/AuthProvider'

/**
 * Create an account. With "Confirm email" on in Supabase, signUp returns a
 * user but no session, so the form would look like it did nothing — show a
 * "check your inbox" panel instead (the web SignupPage rule). With it off,
 * a session arrives and the Stack.Protected guard opens the tracker.
 */
export default function SignupScreen() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState(null)

  async function handleSubmit() {
    // Same validators as the web forms — imported, not copied.
    const next = { email: validateEmail(email), password: validatePassword(password) }
    if (next.email || next.password) {
      setErrors(next)
      return
    }

    setErrors({})
    setBusy(true)
    const { error, needsEmailConfirmation } = await signUp(email.trim(), password)
    setBusy(false)
    if (error) setErrors({ form: friendlyAuthError(error) })
    else if (needsEmailConfirmation) setSentTo(email.trim())
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="grow justify-center p-4"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View className="gap-5 rounded-card border-2 border-border bg-card p-6">
          {sentTo ? (
            <>
              <View className="items-center gap-1">
                <Text className="text-4xl">📬</Text>
                <Text accessibilityRole="header" className="text-2xl font-extrabold text-foreground">
                  Check your inbox
                </Text>
              </View>
              <Text className="text-center text-base text-foreground">
                We sent a confirmation link to <Text className="font-extrabold">{sentTo}</Text>.
              </Text>
              <Text className="text-center text-sm text-muted-foreground">
                Open the email on this phone and tap the link — it opens the app and signs you in.
              </Text>
              <Button label="Go to sign in" onPress={() => router.replace('/login')} />
            </>
          ) : (
            <>
              <View className="items-center gap-1">
                <Text className="text-4xl">🌱</Text>
                <Text accessibilityRole="header" className="text-2xl font-extrabold text-foreground">
                  Start your streak
                </Text>
                <Text className="text-base text-muted-foreground">One small habit at a time.</Text>
              </View>

              <TextField
                id="signup-email"
                label="Email"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <TextField
                id="signup-password"
                label="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                hint="At least 6 characters."
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />

              {errors.form ? (
                <Text accessibilityRole="alert" className="text-center text-base font-bold text-danger">
                  {errors.form}
                </Text>
              ) : null}

              <Button label="Create account" onPress={handleSubmit} busy={busy} />

              <Pressable
                onPress={() => router.replace('/login')}
                accessibilityRole="link"
                className="min-h-12 items-center justify-center"
              >
                <Text className="text-base text-muted-foreground">
                  Already have an account? <Text className="font-extrabold text-sky">Sign in</Text>
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
