import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text } from 'react-native'

import { friendlyDataError } from '@shared/habits'

import { HabitForm } from '@/components/HabitForm'
import { useHabits } from '@/context/HabitsProvider'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * New habit. The one action that works offline: the provider queues it and
 * the list shows it as "Queued" until it syncs. Either way the list says what
 * happened ("Nice! Habit added." / "Saved offline, …").
 */
export default function AddScreen() {
  const { create } = useHabits()
  const online = useOnlineStatus()
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleSubmit(fields) {
    setSaving(true)
    setFormError(null)
    try {
      // The web createHabit underneath, unchanged: no user_id is sent — the
      // column default and the INSERT policy stamp the owner from the JWT.
      await create(fields)
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
      <Text className="text-base text-muted-foreground">
        {online
          ? 'Small and daily beats big and rare.'
          : 'You’re offline — it’ll be saved on this phone and synced when you’re back.'}
      </Text>
      {formError ? (
        <Text accessibilityRole="alert" className="text-base font-bold text-danger">
          {formError}
        </Text>
      ) : null}
      <HabitForm
        submitLabel={online ? 'Add habit' : 'Save for later'}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </ScrollView>
  )
}
