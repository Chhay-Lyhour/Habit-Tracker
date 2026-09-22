import { Link } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

/**
 * List screen — SHELL ONLY. The habit list itself (FlatList, data, states)
 * is hand-write Zone C. This file only proves routing + NativeWind work.
 */
export default function ListScreen() {
  return (
    <View className="flex-1 bg-background p-4">
      {/* HAND-WRITE (Zone C): FlatList of habits goes here. */}
      <Text className="text-foreground">List screen</Text>

      <Link href="/add" asChild>
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-12 items-center justify-center rounded-control bg-grass px-4"
        >
          <Text className="font-bold text-white">Add habit</Text>
        </Pressable>
      </Link>
    </View>
  )
}
