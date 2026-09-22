import Ionicons from '@expo/vector-icons/Ionicons'
import { Text, View } from 'react-native'

/**
 * The web StatsSection, ported. Same three numbers, same maths: all derived
 * from what HabitsProvider already fetched — no extra query — and paused
 * habits are left out of "best streak" and "done today".
 *
 * One tile per row on phones, as on the web: three tiles side by side are too
 * narrow for "Best streak" at a readable size.
 */
const TILES = [
  { key: 'streak', label: 'Best streak', icon: 'flame', tone: 'bg-streak/10', color: '#FF9600' },
  { key: 'done', label: 'Done today', icon: 'checkmark', tone: 'bg-grass/10', color: '#58CC02' },
  { key: 'total', label: 'Habits', icon: 'list', tone: 'bg-sky/10', color: '#1CB0F6' },
]

export function StatsTiles({ habits, doneToday, streaks }) {
  const active = habits.filter((h) => h.is_active)
  const values = {
    streak: Math.max(0, ...active.map((h) => streaks.get(h.id) ?? 0)),
    done: `${active.filter((h) => doneToday.has(h.id)).length}/${active.length}`,
    total: habits.length,
  }

  return (
    <View className="gap-3" accessibilityRole="summary">
      {TILES.map(({ key, label, icon, tone, color }) => (
        <View
          key={key}
          accessible
          accessibilityLabel={`${label}: ${values[key]}`}
          className="flex-row items-center gap-3 rounded-card border-2 border-border bg-card p-4"
        >
          <View className={`size-10 items-center justify-center rounded-full ${tone}`}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-extrabold text-foreground">{values[key]}</Text>
            <Text numberOfLines={1} className="text-sm font-bold text-muted-foreground">
              {label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}
