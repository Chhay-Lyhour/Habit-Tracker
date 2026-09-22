import Ionicons from '@expo/vector-icons/Ionicons'
import { Text, View } from 'react-native'

/** Day counter with a flame — quiet grey at zero, streak orange once alive. */
export function StreakBadge({ days = 0 }) {
  const alive = days > 0

  return (
    <View
      accessible
      accessibilityLabel={`${days} day streak`}
      className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${
        alive ? 'bg-streak/10' : 'bg-muted'
      }`}
    >
      {/* Bright is fine here: the flame is an icon, never behind text. */}
      <Ionicons name="flame" size={16} color={alive ? '#FF9600' : '#767676'} />
      <Text className={`text-sm font-extrabold ${alive ? 'text-streak' : 'text-muted-foreground'}`}>
        {days}
      </Text>
    </View>
  )
}
