import { useState } from 'react'
import { Switch, Text, View } from 'react-native'

import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'

// Same limits as the web HabitFormDialog, which match the check constraints
// in supabase/schema.sql — caught here so the user gets a sentence, not a 23514.
const MAX_TITLE = 80
const MAX_DESCRIPTION = 280

/**
 * The web HabitForm, ported: one form for Add and Edit. With a `habit` it is
 * the edit form and also shows the Active switch (pausing).
 */
export function HabitForm({ habit, saving, disabled, submitLabel, onSubmit, onCancel }) {
  const editing = Boolean(habit)
  const [title, setTitle] = useState(habit?.title ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [isActive, setIsActive] = useState(habit?.is_active ?? true)
  const [errors, setErrors] = useState({})

  function handleSubmit() {
    const trimmed = title.trim()
    const next = {}
    if (!trimmed) next.title = 'Give your habit a name.'
    else if (trimmed.length > MAX_TITLE) next.title = `Keep it under ${MAX_TITLE} characters.`
    if (description.trim().length > MAX_DESCRIPTION) {
      next.description = `Keep it under ${MAX_DESCRIPTION} characters.`
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSubmit({
      title: trimmed,
      description: description.trim() || null,
      ...(editing ? { is_active: isActive } : {}),
    })
  }

  return (
    <View className="gap-5">
      <TextField
        id="habit-title"
        label="Name"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        placeholder="e.g. Read 10 pages"
        autoFocus={!editing}
        returnKeyType="next"
      />

      <TextField
        id="habit-description"
        label="Note (optional)"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        hint={`${description.trim().length}/${MAX_DESCRIPTION}`}
        placeholder="Why it matters, or when you'll do it"
        multiline
        textAlignVertical="top"
        inputClassName="min-h-24 py-3"
      />

      {editing ? (
        <View className="flex-row items-center gap-4 rounded-card border-2 border-border bg-card p-4">
          <View className="min-w-0 flex-1">
            <Text nativeID="active-label" className="text-base font-bold text-foreground">
              Active
            </Text>
            <Text className="text-sm text-muted-foreground">
              Paused habits stay in your history but stop asking.
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            accessibilityLabel="Active"
            accessibilityLabelledBy="active-label"
            trackColor={{ true: '#58CC02', false: '#E5E5E5' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E5E5"
          />
        </View>
      ) : null}

      <Button label={submitLabel} onPress={handleSubmit} busy={saving} disabled={disabled} />
      <Button variant="quiet" label="Cancel" onPress={onCancel} disabled={saving} />
    </View>
  )
}
