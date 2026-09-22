import { useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { friendlyAuthError, validateEmail, validatePassword } from '@shared/validation'

import { Button } from '@/components/Button'
import { useAuth } from '@/context/AuthProvider'

/**
 * Sign in only. Sign-up stays on the web app: with email confirmation on, the
 * confirmation link needs deep-link handling this port does not have yet.
 *
 * No navigation after success: the session change flips the Stack.Protected
 * guards in _layout, which swaps this screen for the list on its own.
 */
export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    // Same validators as the web login form — imported, not copied.
    const next = { email: validateEmail(email), password: validatePassword(password) }
    if (next.email || next.password) {
      setErrors(next)
      return
    }

    setErrors({})
    setBusy(true)
    const { error } = await signIn(email.trim(), password)
    if (error) {
      setErrors({ form: friendlyAuthError(error) })
      setBusy(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="grow justify-center p-4"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View className="gap-5 rounded-card border-2 border-border bg-card p-6">
          <View className="items-center gap-1">
            <Text className="text-4xl">🔥</Text>
            <Text className="text-2xl font-extrabold text-foreground">Welcome back!</Text>
            <Text className="text-base text-muted-foreground">Keep that streak going.</Text>
          </View>

          <View className="gap-1.5">
            <Text nativeID="email-label" className="text-sm font-bold text-foreground">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              accessibilityLabelledBy="email-label"
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              className={`h-12 rounded-control border-2 bg-card px-4 text-base text-foreground ${
                errors.email ? 'border-danger' : 'border-border'
              }`}
            />
            {errors.email ? (
              <Text accessibilityRole="alert" className="text-sm font-bold text-danger">
                {errors.email}
              </Text>
            ) : null}
          </View>

          <View className="gap-1.5">
            <Text nativeID="password-label" className="text-sm font-bold text-foreground">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              accessibilityLabelledBy="password-label"
              accessibilityLabel="Password"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              className={`h-12 rounded-control border-2 bg-card px-4 text-base text-foreground ${
                errors.password ? 'border-danger' : 'border-border'
              }`}
            />
            {errors.password ? (
              <Text accessibilityRole="alert" className="text-sm font-bold text-danger">
                {errors.password}
              </Text>
            ) : null}
          </View>

          {errors.form ? (
            <Text accessibilityRole="alert" className="text-center text-base font-bold text-danger">
              {errors.form}
            </Text>
          ) : null}

          <Button label="Sign in" onPress={handleSubmit} busy={busy} />

          <Text className="text-center text-sm text-muted-foreground">
            New here? Create your account on the web app, then sign in.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
