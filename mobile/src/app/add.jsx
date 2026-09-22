import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

/**
 * Add screen — SHELL ONLY. The form and the create call are hand-write
 * Zone C. This file only proves the List → Add → back flow.
 */
export default function AddScreen() {
  return (
    <View className="flex-1 bg-background p-4">
      {/* HAND-WRITE (Zone C): title/description form and submit go here. */}
      <Text className="text-foreground">Add screen</Text>

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        className="mt-4 min-h-12 items-center justify-center rounded-control bg-muted px-4"
      >
        <Text className="font-bold text-foreground">Back to list</Text>
      </Pressable>
    </View>
  )
}
