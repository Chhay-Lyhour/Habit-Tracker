import Ionicons from '@expo/vector-icons/Ionicons'
import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { StreakBadge } from '@/components/StreakBadge'

/**
 * One habit — the native port of the web HabitCard. The classes are the web
 * ones carried over: `rounded-card border-2 bg-card p-4`, the 48px round tick
 * (`size-12 rounded-full border-2`), `truncate` becomes numberOfLines={1}.
 *
 * Two targets, like the web card: the circle ticks, the rest opens the edit
 * screen (the web ⋯ menu — Edit / Delete — becomes a tap on phones).
 *
 * memo: FlatList re-renders rows when its data changes. Only the row whose
 * props changed (the one ticked) actually re-renders.
 */
export const HabitRow = memo(function HabitRow({
  habit,
  completed,
  streak,
  pending,
  offline,
  onToggle,
  onOpen,
}) {
  const tickDisabled = pending || offline

  return (
    <View
      className={`flex-row items-center gap-3 rounded-card border-2 p-4 ${
        completed ? 'border-grass-bright/60 bg-accent/40' : 'border-border bg-card'
      } ${habit.is_active ? '' : 'opacity-60'}`}
    >
      <Pressable
        onPress={() => onToggle(habit, !completed)}
        disabled={tickDisabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled: tickDisabled }}
        accessibilityLabel={
          offline
            ? `${habit.title} — ticking is unavailable while you're offline`
            : completed
              ? `Mark ${habit.title} as not done today`
              : `Mark ${habit.title} as done today`
        }
        hitSlop={4}
        // Optimistic: `completed` already shows the new state while it saves;
        // the dimmed circle is the only "saving" signal, and it blocks a
        // second tap until the server answers.
        className={`size-12 items-center justify-center rounded-full border-2 ${
          completed ? 'border-grass bg-grass' : 'border-border bg-card'
        } ${offline || pending ? 'opacity-60' : ''}`}
      >
        {completed ? <Ionicons name="checkmark" size={26} color="#FFFFFF" /> : null}
      </Pressable>

      <Pressable
        onPress={() => onOpen(habit)}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${habit.title}`}
        accessibilityHint="Rename, pause or delete this habit"
        className="min-h-12 min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
      >
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
        <Ionicons name="chevron-forward" size={18} color="#767676" />
      </Pressable>
    </View>
  )
})
