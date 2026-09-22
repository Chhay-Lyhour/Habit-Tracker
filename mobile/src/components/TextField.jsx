import { Text, TextInput, View } from 'react-native'

/**
 * Label + input + error, the native FormField. The label is linked to the
 * input (accessibilityLabelledBy on Android, accessibilityLabel on iOS) and
 * the error is announced (role alert) — the same rules as the web forms.
 * `text-base` keeps the text at 16px.
 */
export function TextField({ id, label, error, hint, inputClassName = '', ...inputProps }) {
  return (
    <View className="gap-1.5">
      <Text nativeID={`${id}-label`} className="text-sm font-bold text-foreground">
        {label}
      </Text>
      <TextInput
        accessibilityLabelledBy={`${id}-label`}
        accessibilityLabel={label}
        placeholderTextColor="#767676"
        className={`min-h-12 rounded-control border-2 bg-card px-4 text-base text-foreground ${
          error ? 'border-danger' : 'border-border'
        } ${inputClassName}`}
        {...inputProps}
      />
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-sm font-bold text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  )
}
