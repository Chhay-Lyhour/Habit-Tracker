import '../../global.css'

import { router, SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text } from 'react-native'

import { UserAvatar } from '@/components/UserAvatar'
import { AuthProvider, useAuth } from '@/context/AuthProvider'
import { HabitsProvider } from '@/context/HabitsProvider'
import { ProfileProvider, useProfile } from '@/context/ProfileProvider'
import { shareApp } from '@/lib/share'

// The native twin of the web ProtectedRoute skeleton: keep the splash screen
// up until the stored session has been read, so a signed-in user never sees
// the login screen flash on launch.
SplashScreen.preventAutoHideAsync()

function ShareButton() {
  return (
    <Pressable
      onPress={() => shareApp().catch(() => {})}
      accessibilityRole="button"
      accessibilityLabel="Share Habit Tracker"
      hitSlop={12}
      className="min-h-12 justify-center px-2"
    >
      <Text className="font-bold text-sky">Share</Text>
    </Pressable>
  )
}

/** The web header's account menu: your avatar, opening the profile screen. */
function AccountButton() {
  const { user } = useAuth()
  const { profile, status } = useProfile()

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel="Your profile"
      hitSlop={8}
      className="min-h-12 justify-center pr-2"
    >
      <UserAvatar
        uri={profile?.avatar_url}
        email={user?.email}
        size={34}
        loading={status === 'loading'}
      />
    </Pressable>
  )
}

function RootNavigator() {
  const { session, loading } = useAuth()

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
            headerLeft: () => <AccountButton />,
            headerRight: () => <ShareButton />,
          }}
        />
        <Stack.Screen name="add" options={{ title: 'New habit', presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ title: 'Edit habit', presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      </Stack.Protected>

      {/* Signed out only — like the web PublicOnlyRoute. */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Inside AuthProvider: both load for the signed-in user and clear
          themselves on sign-out, so the next account starts empty. */}
      <ProfileProvider>
        <HabitsProvider>
          <RootNavigator />
        </HabitsProvider>
      </ProfileProvider>
      <StatusBar style="dark" />
    </AuthProvider>
  )
}
