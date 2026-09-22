import Ionicons from '@expo/vector-icons/Ionicons'
import { Text, View } from 'react-native'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Shown only while offline; announced once when it appears (role alert). */
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-center gap-2 border-b-2 border-streak/30 bg-streak/10 px-4 py-3"
    >
      <Ionicons name="cloud-offline" size={18} color="#B35F00" />
      <Text className="flex-1 text-sm font-bold text-streak">
        You’re offline. New habits are saved and sync when you’re back.
      </Text>
    </View>
  )
}
