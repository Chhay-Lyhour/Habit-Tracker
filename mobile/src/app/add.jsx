import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'

import { createHabit, friendlyDataError } from '@shared/habits'

import { Button } from '@/components/Button'

// Same limits as the web HabitFormDialog, which match the check constraints
// in supabase/schema.sql — caught here so the user gets a sentence, not a 23514.
const MAX_TITLE = 80
const MAX_DESCRIPTION = 280

export default function AddScreen() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    const trimmed = title.trim()
    const next = {}
    if (!trimmed) next.title = 'Give your habit a name.'
    else if (trimmed.length > MAX_TITLE) next.title = `Keep it under ${MAX_TITLE} characters.`
    if (description.trim().length > MAX_DESCRIPTION) {
      next.description = `Keep it under ${MAX_DESCRIPTION} characters.`
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setErrors({})
    setSaving(true)
    try {
      // The web createHabit, unchanged: no user_id is sent — the column
      // default and the INSERT policy stamp the owner from the JWT.
      await createHabit({ title: trimmed, description: description.trim() || null })
      // Back to the list; its useFocusEffect refetches and shows the habit.
      router.back()
    } catch (caught) {
      setErrors({ form: friendlyDataError(caught) })
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
      <Text className="text-base text-muted-foreground">Small and daily beats big and rare.</Text>

      <View className="gap-1.5">
        <Text nativeID="title-label" className="text-sm font-bold text-foreground">
          Name
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          accessibilityLabelledBy="title-label"
          accessibilityLabel="Name"
          placeholder="e.g. Read 10 pages"
          placeholderTextColor="#767676"
          autoFocus
          returnKeyType="next"
          className={`h-12 rounded-control border-2 bg-card px-4 text-base text-foreground ${
            errors.title ? 'border-danger' : 'border-border'
          }`}
        />
        {errors.title ? (
          <Text accessibilityRole="alert" className="text-sm font-bold text-danger">
            {errors.title}
          </Text>
        ) : null}
      </View>

      <View className="gap-1.5">
        <Text nativeID="description-label" className="text-sm font-bold text-foreground">
          Note (optional)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          accessibilityLabelledBy="description-label"
          accessibilityLabel="Note, optional"
          placeholder="Why it matters, or when you'll do it"
          placeholderTextColor="#767676"
          multiline
          textAlignVertical="top"
          className={`min-h-24 rounded-control border-2 bg-card px-4 py-3 text-base text-foreground ${
            errors.description ? 'border-danger' : 'border-border'
          }`}
        />
        <Text className="text-right text-xs text-muted-foreground">
          {description.trim().length}/{MAX_DESCRIPTION}
        </Text>
        {errors.description ? (
          <Text accessibilityRole="alert" className="text-sm font-bold text-danger">
            {errors.description}
          </Text>
        ) : null}
      </View>

      {errors.form ? (
        <Text accessibilityRole="alert" className="text-base font-bold text-danger">
          {errors.form}
        </Text>
      ) : null}

      <Button label="Add habit" onPress={handleSubmit} busy={saving} />
      <Button variant="quiet" label="Cancel" onPress={() => router.back()} disabled={saving} />
    </ScrollView>
  )
}
