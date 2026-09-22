import Ionicons from '@expo/vector-icons/Ionicons'
import { memo } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { StreakBadge } from '@/components/StreakBadge'

/**
 * One habit — the native port of the web HabitCard. The classes are the web
 * ones carried over: `rounded-card border-2 bg-card p-4`, the 48px round tick
 * (`size-12 rounded-full border-2`), `truncate` becomes numberOfLines={1}.
 *
 * memo: FlatList re-renders rows when `extraData` changes. Only the row whose
 * props changed (the one ticked) actually re-renders.
 */
export const HabitRow = memo(function HabitRow({ habit, completed, streak, pending, onToggle }) {
  return (
    <View
      className={`flex-row items-center gap-4 rounded-card border-2 p-4 ${
        completed ? 'border-grass-bright/60 bg-accent/40' : 'border-border bg-card'
      } ${habit.is_active ? '' : 'opacity-60'}`}
    >
      <Pressable
        onPress={() => onToggle(habit, !completed)}
        disabled={pending}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled: pending }}
        accessibilityLabel={
          completed ? `Mark ${habit.title} as not done today` : `Mark ${habit.title} as done today`
        }
        hitSlop={4}
        className={`size-12 items-center justify-center rounded-full border-2 ${
          completed ? 'border-grass bg-grass' : 'border-border bg-card'
        }`}
      >
        {pending ? (
          <ActivityIndicator color="#767676" />
        ) : completed ? (
          <Ionicons name="checkmark" size={26} color="#FFFFFF" />
        ) : null}
      </Pressable>

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className={`text-lg font-extrabold ${completed ? 'text-accent-foreground' : 'text-foreground'}`}
        >
          {habit.title}
        </Text>
        {habit.description ? (
          <Text numberOfLines={1} className="text-sm text-muted-foreground">
            {habit.description}
          </Text>
        ) : null}
        {!habit.is_active ? (
          <Text className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Paused
          </Text>
        ) : null}
      </View>

      <StreakBadge days={streak} />
    </View>
  )
})
