import { useState } from 'react'
import { Image, Text, View } from 'react-native'

/** "chhay.lyhour@…" → "CL", "sam@…" → "S" — same rule as the web UserAvatar. */
function initialsFrom(email) {
  return (email?.split('@')[0] ?? '')
    .split(/[._\-+]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

/**
 * Photo when there is one, initials otherwise — including when the photo
 * fails to load. `size` is in px; the box is always that size, so nothing
 * moves when the photo arrives (the Zone B rule, native edition).
 */
export function UserAvatar({ uri, email, size = 40, loading = false }) {
  const [failedUri, setFailedUri] = useState(null)
  const showImage = uri && failedUri !== uri
  const box = { width: size, height: size }

  if (loading) return <View style={box} className="rounded-full bg-muted" />

  return (
    <View
      style={box}
      className="items-center justify-center overflow-hidden rounded-full bg-sky/10"
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={box}
          accessibilityIgnoresInvertColors
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <Text style={{ fontSize: size * 0.36 }} className="font-extrabold text-sky">
          {initialsFrom(email) || '👋'}
        </Text>
      )}
    </View>
  )
}
