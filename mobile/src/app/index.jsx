import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// The web app's data layer and streak rules, imported unchanged. Only the
// Supabase client underneath differs (see src/lib/supabase.js).
import {
  friendlyDataError,
  isoDaysAgo,
  listHabits,
  listLogsSince,
  logHabitToday,
  todayISO,
  unlogHabitToday,
} from '@shared/habits'
import { summariseLogs } from '@shared/streaks'

import { Button } from '@/components/Button'
import { HabitRow } from '@/components/HabitRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States'
import { useAuth } from '@/context/AuthProvider'

// Same window as the web useHabits: enough history to count a long streak.
const STREAK_WINDOW_DAYS = 120

function Separator() {
  return <View className="h-3" />
}

export default function ListScreen() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [toggleError, setToggleError] = useState(null)

  // Monotonic id, as on the web: a slow earlier response must not overwrite a
  // newer one, and nothing is written after the screen unmounts.
  const requestRef = useRef(0)
  useEffect(() => () => { requestRef.current += 1 }, [])

  const load = useCallback(
    async ({ showSkeleton = false, pull = false } = {}) => {
      if (!userId) return
      const requestId = (requestRef.current += 1)
      if (showSkeleton) setStatus('loading')
      if (pull) setRefreshing(true)

      try {
        const [nextHabits, nextLogs] = await Promise.all([
          listHabits(userId),
          listLogsSince(userId, isoDaysAgo(STREAK_WINDOW_DAYS)),
        ])
        if (requestRef.current !== requestId) return
        setHabits(nextHabits)
        setLogs(nextLogs)
        setError(null)
        setStatus('ready')
      } catch (caught) {
        if (requestRef.current !== requestId) return
        setError(caught)
        setStatus('error')
      } finally {
        if (requestRef.current === requestId) setRefreshing(false)
      }
    },
    [userId]
  )

  // Runs on first focus AND every time the screen comes back into focus —
  // which is how a habit created on the Add screen shows up here. Quiet: the
  // list stays on screen while it refreshes.
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const today = todayISO()
  const { doneToday, streaks } = useMemo(() => summariseLogs(logs, today), [logs, today])

  // Stable identity so memo(HabitRow) can skip rows that did not change.
  const handleToggle = useCallback(async (habit, nextCompleted) => {
    const date = todayISO()
    setToggleError(null)
    setPendingIds((prev) => new Set(prev).add(habit.id))

    try {
      if (nextCompleted) {
        const log = await logHabitToday(habit.id, date)
        setLogs((prev) => [
          log,
          ...prev.filter((l) => !(l.habit_id === habit.id && l.log_date === date)),
        ])
      } else {
        await unlogHabitToday(habit.id, date)
        setLogs((prev) => prev.filter((l) => !(l.habit_id === habit.id && l.log_date === date)))
      }
    } catch (caught) {
      // Inline, not Alert.alert: Alert is a no-op on the web target.
      setToggleError(friendlyDataError(caught))
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(habit.id)
        return next
      })
    }
  }, [])

  const renderItem = useCallback(
    ({ item }) => (
      <HabitRow
        habit={item}
        completed={doneToday.has(item.id)}
        streak={streaks.get(item.id) ?? 0}
        pending={pendingIds.has(item.id)}
        onToggle={handleToggle}
      />
    ),
    [doneToday, streaks, pendingIds, handleToggle]
  )

  const doneCount = habits.filter((h) => doneToday.has(h.id)).length

  return (
    <View className="flex-1 bg-background">
      {status === 'loading' ? (
        <ListSkeleton />
      ) : status === 'error' ? (
        <ErrorState
          message={friendlyDataError(error)}
          onRetry={() => load({ showSkeleton: true })}
        />
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(habit) => habit.id}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
          contentContainerClassName="grow p-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ pull: true })}
              tintColor="#428407"
              colors={['#428407']}
            />
          }
          ListHeaderComponent={
            <View className="mb-3 gap-2">
              {habits.length > 0 ? (
                <Text className="text-base font-bold text-muted-foreground">
                  {doneCount} of {habits.length} done today
                </Text>
              ) : null}
              {toggleError ? (
                <Text
                  accessibilityRole="alert"
                  className="rounded-control bg-danger/10 p-3 text-base font-bold text-danger"
                >
                  {toggleError}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No habits yet. Start your first one!"
              description="Small and daily beats big and rare."
            />
          }
        />
      )}

      <SafeAreaView edges={['bottom']} className="border-t-2 border-border bg-card px-4 pt-3">
        <Button label="Add habit" onPress={() => router.push('/add')} className="mb-3" />
      </SafeAreaView>
    </View>
  )
}
