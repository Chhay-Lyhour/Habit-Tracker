import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, Text, View } from 'react-native'

/**
 * The web QueuedHabitCard, ported: a habit created offline that has not
 * reached the server yet. Deliberately inert — no tick, no edit — because it
 * has no database row to act on. Muted and dashed, so it reads as "not quite
 * real yet". After a non-network failure it offers Retry and Discard, or a
 * habit the server will never accept would sit in the queue forever.
 */
export function QueuedHabitRow({ item, offline, onRetry, onDiscard }) {
  const failed = Boolean(item.lastError)

  return (
    <View
      accessible={!failed}
      accessibilityLabel={
        failed
          ? `${item.title} — this habit could not be saved yet.`
          : `${item.title} — queued, will be saved when you are back online.`
      }
      className="flex-row items-center gap-3 rounded-card border-2 border-dashed border-border bg-muted/40 p-4"
    >
      <View className="size-12 items-center justify-center rounded-full border-2 border-dashed border-border">
        <Ionicons name="time-outline" size={24} color="#767676" />
      </View>

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-lg font-extrabold text-muted-foreground">
          {item.title}
        </Text>
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {failed ? 'Didn’t sync' : 'Queued'}
        </Text>
      </View>

      {failed ? (
        <View className="flex-row">
          <Pressable
            onPress={() => onRetry(item.id)}
            disabled={offline}
            accessibilityRole="button"
            accessibilityLabel={`Retry saving ${item.title}`}
            className={`size-12 items-center justify-center ${offline ? 'opacity-40' : ''}`}
          >
            <Ionicons name="refresh" size={22} color="#4B4B4B" />
          </Pressable>
          <Pressable
            onPress={() => onDiscard(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Discard ${item.title}`}
            className="size-12 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#4B4B4B" />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
