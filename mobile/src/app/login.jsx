import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { friendlyAuthError, validateEmail, validatePassword } from '@shared/validation'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/context/AuthProvider'

/**
 * No navigation after success: the session change flips the Stack.Protected
 * guards in _layout, which swaps this screen for the tracker on its own.
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
            <Text accessibilityRole="header" className="text-2xl font-extrabold text-foreground">
              Welcome back!
            </Text>
            <Text className="text-base text-muted-foreground">Keep that streak going.</Text>
          </View>

          <TextField
            id="login-email"
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
            id="login-password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          {errors.form ? (
            <Text accessibilityRole="alert" className="text-center text-base font-bold text-danger">
              {errors.form}
            </Text>
          ) : null}

          <Button label="Sign in" onPress={handleSubmit} busy={busy} />

          <Pressable
            onPress={() => router.replace('/signup')}
            accessibilityRole="link"
            className="min-h-12 items-center justify-center"
          >
            <Text className="text-base text-muted-foreground">
              New here? <Text className="font-extrabold text-sky">Create an account</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
