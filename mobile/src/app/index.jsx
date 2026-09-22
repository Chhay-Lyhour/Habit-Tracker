import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { friendlyDataError } from '@shared/habits'

import { Button } from '@/components/Button'
import { HabitRow } from '@/components/HabitRow'
import { OfflineBanner } from '@/components/OfflineBanner'
import { QueuedHabitRow } from '@/components/QueuedHabitRow'
import { StatsTiles } from '@/components/StatsTiles'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States'
import { useHabits } from '@/context/HabitsProvider'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const NOTICE_MS = 3500

function Separator() {
  return <View className="h-3" />
}

/** The tracker: offline banner, stats, the habit FlatList, and Add. */
export default function ListScreen() {
  const {
    habits,
    queued,
    status,
    error,
    refreshing,
    pendingIds,
    doneToday,
    streaks,
    notice,
    load,
    toggle,
    retryQueued,
    discard,
    clearNotice,
  } = useHabits()
  const online = useOnlineStatus()
  const [toggleError, setToggleError] = useState(null)

  // The native stand-in for a toast: show the notice, then let it go.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(clearNotice, NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice, clearNotice])

  // Stable identity so memo(HabitRow) can skip rows that did not change.
  const handleToggle = useCallback(
    async (habit, nextCompleted) => {
      setToggleError(null)
      try {
        await toggle(habit, nextCompleted)
      } catch (caught) {
        // Inline, not Alert.alert: Alert is a no-op on the web target.
        setToggleError(friendlyDataError(caught))
      }
    },
    [toggle]
  )

  const handleOpen = useCallback((habit) => router.push(`/habit/${habit.id}`), [])

  // Saved habits first, then the queued ones — the web order. Queued items
  // are not counted in the stats: they are not habits yet.
  const rows = useMemo(
    () => [...habits, ...queued.map((item) => ({ ...item, queued: true }))],
    [habits, queued]
  )

  const renderItem = useCallback(
    ({ item }) =>
      item.queued ? (
        <QueuedHabitRow
          item={item}
          offline={!online}
          onRetry={retryQueued}
          onDiscard={discard}
        />
      ) : (
        <HabitRow
          habit={item}
          completed={doneToday.has(item.id)}
          streak={streaks.get(item.id) ?? 0}
          pending={pendingIds.has(item.id)}
          offline={!online}
          onToggle={handleToggle}
          onOpen={handleOpen}
        />
      ),
    [doneToday, streaks, pendingIds, online, handleToggle, handleOpen, retryQueued, discard]
  )

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner />

      {notice ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className="mx-4 mt-3 rounded-control bg-accent px-4 py-3"
        >
          <Text className="text-base font-bold text-accent-foreground">{notice}</Text>
        </View>
      ) : null}

      {status === 'loading' ? (
        <ListSkeleton />
      ) : status === 'error' ? (
        <ErrorState message={friendlyDataError(error)} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
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
            <View className="mb-5 gap-5">
              <StatsTiles habits={habits} doneToday={doneToday} streaks={streaks} />
              {rows.length > 0 ? (
                <Text accessibilityRole="header" className="text-xl font-extrabold text-foreground">
                  Your habits
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
        {/* Works offline: a new habit is queued and synced later. */}
        <Button label="Add habit" onPress={() => router.push('/add')} className="mb-3" />
      </SafeAreaView>
    </View>
  )
}
