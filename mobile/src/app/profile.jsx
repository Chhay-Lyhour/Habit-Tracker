import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/Button'
import { UserAvatar } from '@/components/UserAvatar'
import { useAuth } from '@/context/AuthProvider'
import { useHabits } from '@/context/HabitsProvider'
import { useProfile } from '@/context/ProfileProvider'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * The web AvatarUploader + the account menu's Sign out, as one screen.
 *
 * States, as on the web: loading → skeleton circle; load error → message +
 * Try again; no avatar → initials + "No photo yet"; upload error → inline
 * message (the photo can be picked again); success → short confirmation.
 */
export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const { profile, status, error, reload, uploadFromUri } = useProfile()
  const online = useOnlineStatus()

  const [previewUri, setPreviewUri] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [message, setMessage] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const { queued, clearQueued } = useHabits()

  async function handlePick() {
    setUploadError(null)
    setMessage(null)

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // iOS shows a square crop — avatars are circles
      aspect: [1, 1],
      quality: 1, // re-encoded in prepareAvatar, so pick at full quality
    })
    if (picked.canceled) return

    const uri = picked.assets[0].uri
    setPreviewUri(uri)
    setUploading(true)
    try {
      await uploadFromUri(uri)
      setMessage('Looking good! Photo updated.')
    } catch (caught) {
      setUploadError(caught.message)
    } finally {
      setPreviewUri(null)
      setUploading(false)
    }
  }

  async function handleSignOut() {
    // Unsynced habits belong to this session only — the web UserMenu rule:
    // ask first, and only then throw them away.
    if (queued.length > 0 && !confirmingSignOut) {
      setConfirmingSignOut(true)
      return
    }
    setSigningOut(true)
    // Before signOut: afterwards there is no user id to find the queue by.
    await clearQueued()
    // The Stack.Protected guard swaps to the login screen on its own; the
    // habits and profile providers clear themselves when the user goes.
    await signOut()
  }

  const hasAvatar = Boolean(profile?.avatar_url)

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 p-4">
      <View className="items-center gap-4 rounded-card border-2 border-border bg-card p-6">
        {status === 'error' ? (
          <View className="items-center gap-3">
            <Text accessibilityRole="alert" className="text-center text-base text-muted-foreground">
              {error}
            </Text>
            <Button variant="quiet" label="Try again" onPress={reload} />
          </View>
        ) : (
          <>
            <View className="items-center justify-center">
              <UserAvatar
                uri={previewUri ?? profile?.avatar_url}
                email={user?.email}
                size={96}
                loading={status === 'loading'}
              />
              {uploading ? (
                <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </View>

            <View className="w-full items-center gap-1">
              <Text className="text-xl font-extrabold text-foreground">You</Text>
              <Text numberOfLines={1} className="text-sm text-muted-foreground">
                {user?.email}
              </Text>
              {status === 'ready' && !hasAvatar && !uploading ? (
                <Text className="mt-1 text-center text-base text-foreground">
                  No photo yet. Add one and make it yours!
                </Text>
              ) : null}
            </View>

            {uploadError ? (
              <Text accessibilityRole="alert" className="text-center text-base font-bold text-danger">
                {uploadError}
              </Text>
            ) : null}
            {message ? (
              <Text accessibilityRole="alert" className="text-center text-base font-bold text-grass">
                {message}
              </Text>
            ) : null}

            <Button
              variant="brand"
              label={
                !online
                  ? 'Offline'
                  : uploadError
                    ? 'Try another photo'
                    : hasAvatar
                      ? 'Change photo'
                      : 'Add photo'
              }
              onPress={handlePick}
              busy={uploading}
              disabled={!online || status !== 'ready'}
              className="self-stretch"
            />
            <Text className="text-center text-xs text-muted-foreground">
              Any photo works — it’s cropped square and resized before upload.
            </Text>
          </>
        )}
      </View>

      {confirmingSignOut ? (
        <View className="gap-3 rounded-card border-2 border-danger/30 bg-card p-4">
          <Text accessibilityRole="header" className="text-lg font-extrabold text-foreground">
            Sign out and lose {queued.length} unsynced habit{queued.length === 1 ? '' : 's'}?
          </Text>
          <Text className="text-base text-muted-foreground">
            They were added offline and haven’t reached the server yet. Signing out deletes them
            from this phone.
          </Text>
          <Button variant="danger" label="Sign out anyway" onPress={handleSignOut} busy={signingOut} />
          <Button
            variant="quiet"
            label="Stay signed in"
            onPress={() => setConfirmingSignOut(false)}
            disabled={signingOut}
          />
        </View>
      ) : (
        <Button variant="quiet" label="Sign out" onPress={handleSignOut} busy={signingOut} />
      )}
    </ScrollView>
  )
}
