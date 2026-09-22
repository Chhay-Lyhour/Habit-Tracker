import { ActivityIndicator, Pressable, Text } from 'react-native'

/**
 * The 3D button from the web app. On the web it is a 4px box-shadow; here it
 * is a 4px bottom border. Pressed, the border goes and a 4px top margin takes
 * its place — the face sinks, but the total height never changes, so the rows
 * around it do not move (same rule as the web version).
 */
const VARIANTS = {
  brand: {
    face: 'bg-grass border-grass-edge',
    label: 'text-white',
    spinner: '#FFFFFF',
  },
  quiet: {
    face: 'bg-card border-2 border-border',
    label: 'text-foreground',
    spinner: '#4B4B4B',
  },
}

export function Button({ variant = 'brand', label, onPress, disabled, busy, className = '' }) {
  const v = VARIANTS[variant]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || busy), busy: Boolean(busy) }}
      className={`min-h-12 flex-row items-center justify-center rounded-control border-b-4 px-5 active:mt-1 active:border-b-0 ${v.face} ${disabled || busy ? 'opacity-60' : ''} ${className}`}
    >
      {busy ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <Text className={`text-base font-extrabold uppercase tracking-wide ${v.label}`}>{label}</Text>
      )}
    </Pressable>
  )
}
