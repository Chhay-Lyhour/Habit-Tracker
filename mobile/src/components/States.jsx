import { Text, View } from 'react-native'

import { Button } from '@/components/Button'

/**
 * The three async states every list needs (AGENTS.md "Design rules"):
 * a skeleton while loading, an error with a retry, and an encouraging empty
 * state — an empty list is not an error and is never shown as one.
 */

export function ListSkeleton() {
  return (
    <View
      className="gap-3 p-4"
      accessible
      accessibilityLabel="Loading your habits"
      accessibilityState={{ busy: true }}
    >
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-20 rounded-card bg-muted" />
      ))}
    </View>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <View className="m-4 items-center gap-3 rounded-card border-2 border-danger/30 bg-card px-6 py-10">
      <Text className="text-4xl">😕</Text>
      <Text className="text-center text-xl font-extrabold text-foreground">
        Couldn’t load your habits
      </Text>
      <Text accessibilityRole="alert" className="text-center text-base text-muted-foreground">
        {message}
      </Text>
      <Button variant="quiet" label="Try again" onPress={onRetry} className="mt-2" />
    </View>
  )
}

export function EmptyState({ title, description }) {
  return (
    <View className="items-center gap-4 rounded-card border-2 border-dashed border-border bg-card px-6 py-14">
      <View className="size-20 items-center justify-center rounded-full bg-accent">
        <Text className="text-4xl">🌱</Text>
      </View>
      <Text className="text-center text-xl font-extrabold text-foreground">{title}</Text>
      {description ? (
        <Text className="text-center text-base text-muted-foreground">{description}</Text>
      ) : null}
    </View>
  )
}
