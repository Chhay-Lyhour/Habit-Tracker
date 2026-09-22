import '../../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text } from 'react-native'

import { shareApp } from '@/lib/share'

function ShareHeaderButton() {
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

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#F7F7F7' },
          headerTintColor: '#4B4B4B',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Habits', headerRight: () => <ShareHeaderButton /> }}
        />
        <Stack.Screen name="add" options={{ title: 'New habit', presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  )
}
