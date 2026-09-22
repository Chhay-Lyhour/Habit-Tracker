import '../../global.css'

import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text } from 'react-native'

import { AuthProvider, useAuth } from '@/context/AuthProvider'
import { shareApp } from '@/lib/share'

// The native twin of the web ProtectedRoute skeleton: keep the splash screen
// up until the stored session has been read, so a signed-in user never sees
// the login screen flash on launch.
SplashScreen.preventAutoHideAsync()

function HeaderButton({ label, accessibilityLabel, onPress, className = '' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={12}
      className="min-h-12 justify-center px-2"
    >
      <Text className={`font-bold ${className}`}>{label}</Text>
    </Pressable>
  )
}

function RootNavigator() {
  const { session, loading, signOut } = useAuth()

  if (!loading) SplashScreen.hide()

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: '#F7F7F7' },
        headerTintColor: '#4B4B4B',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      {/* Signed in only — like the web ProtectedRoute. */}
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen
          name="index"
          options={{
            title: 'Habits',
            headerLeft: () => (
              <HeaderButton label="Sign out" onPress={signOut} className="text-muted-foreground" />
            ),
            headerRight: () => (
              <HeaderButton
                label="Share"
                accessibilityLabel="Share Habit Tracker"
                onPress={() => shareApp().catch(() => {})}
                className="text-sky"
              />
            ),
          }}
        />
        <Stack.Screen name="add" options={{ title: 'New habit', presentation: 'modal' }} />
      </Stack.Protected>

      {/* Signed out only — like the web PublicOnlyRoute. */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  )
}
