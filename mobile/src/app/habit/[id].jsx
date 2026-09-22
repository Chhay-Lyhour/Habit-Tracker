import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { friendlyDataError } from '@shared/habits'

import { Button } from '@/components/Button'
import { HabitForm } from '@/components/HabitForm'
import { useHabits } from '@/context/HabitsProvider'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Edit / pause / delete one habit — the web ⋯ menu, HabitFormDialog and
 * DeleteHabitDialog in one screen.
 *
 * The delete confirmation is inline rather than Alert.alert: it reads the same
 * on iOS, Android and the web target (where Alert does nothing), and it keeps
 * the web copy word for word.
 */
export default function EditHabitScreen() {
  const { id } = useLocalSearchParams()
  const { habits, update, remove } = useHabits()
  const online = useOnlineStatus()

  // Snapshot on open: after a delete the habit leaves the shared list, and the
  // screen must not flash "not found" while it closes.
  const [habit] = useState(() => habits.find((h) => h.id === id) ?? null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [formError, setFormError] = useState(null)

  if (!habit) {
    return (
      <View className="flex-1 gap-4 bg-background p-4">
        <Text className="text-base text-foreground">That habit no longer exists.</Text>
        <Button variant="quiet" label="Back to list" onPress={() => router.back()} />
      </View>
    )
  }

  async function run(action) {
    setSaving(true)
    setFormError(null)
    try {
      await action()
      router.back()
    } catch (caught) {
      setFormError(friendlyDataError(caught))
      setSaving(false)
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 p-4"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {!online ? (
        <Text accessibilityRole="alert" className="text-base font-bold text-streak">
          You’re offline. Editing is available when you reconnect.
        </Text>
      ) : null}
      {formError ? (
        <Text accessibilityRole="alert" className="text-base font-bold text-danger">
          {formError}
        </Text>
      ) : null}

      <HabitForm
        habit={habit}
        submitLabel="Save"
        saving={saving && !confirming}
        disabled={!online || confirming}
        onSubmit={(patch) => run(() => update(habit.id, patch))}
        onCancel={() => router.back()}
      />

      <View className="gap-3 border-t-2 border-border pt-5">
        {confirming ? (
          <View className="gap-3 rounded-card border-2 border-danger/30 bg-card p-4">
            <Text accessibilityRole="header" className="text-lg font-extrabold text-foreground">
              Delete “{habit.title}”?
            </Text>
            <Text className="text-base text-muted-foreground">
              This also deletes every day you logged for it, including the streak. It cannot be
              undone.
            </Text>
            <Button
              variant="danger"
              label="Delete habit"
              busy={saving}
              disabled={!online}
              onPress={() => run(() => remove(habit.id))}
            />
            <Button
              variant="quiet"
              label="Keep it"
              disabled={saving}
              onPress={() => setConfirming(false)}
            />
          </View>
        ) : (
          <Button
            variant="dangerQuiet"
            label="Delete habit"
            disabled={!online || saving}
            onPress={() => setConfirming(true)}
          />
        )}
      </View>
    </ScrollView>
  )
}
