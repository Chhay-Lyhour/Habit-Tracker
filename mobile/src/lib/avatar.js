import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

// The web app's avatar rules, imported unchanged (hand-write zone 3).
import { validateAvatar } from '@shared/validateAvatar'
import { AVATAR_BUCKET } from '@shared/profile'

import { supabase } from '@/lib/supabase'

/**
 * The native half of the web uploadAvatar(file). The web version takes a
 * browser File from an <input type="file">; the image picker returns a
 * `{ uri }` instead (audit leak 11), so this file turns that URI into what
 * the shared code expects — and nothing more.
 */

/**
 * Picked photo → 512px square JPEG. iPhone photos are HEIC and often several
 * MB; the bucket accepts only JPG / PNG / WebP up to 1 MB. Re-encoding here
 * makes every pick valid instead of refusing most of them.
 */
export async function prepareAvatar(uri) {
  const image = await ImageManipulator.manipulate(uri).resize({ width: 512 }).renderAsync()
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 })
  return saved.uri
}

/**
 * Reads the prepared file and runs the web validateAvatar on it. It needs
 * `size`, `type` and `slice(0, 12).arrayBuffer()` — the Blob surface of a
 * browser File — so the bytes are wrapped in exactly that shape. The magic-
 * byte check therefore runs on the real bytes that are about to be uploaded.
 */
export async function readAndValidate(uri) {
  const buffer = await new File(uri).arrayBuffer()
  const blobLike = {
    size: buffer.byteLength,
    type: 'image/jpeg',
    slice: (start, end) => ({ arrayBuffer: async () => buffer.slice(start, end) }),
  }

  const result = await validateAvatar(blobLike)
  if (!result.ok) {
    const invalid = new Error(result.error)
    invalid.code = 'INVALID_AVATAR'
    throw invalid
  }
  return { buffer, type: blobLike.type }
}

/**
 * Same steps, same path and same guarantees as the web uploadAvatar:
 * `<uid>/avatar` (fixed name, so upsert replaces), explicit contentType,
 * `?v=` cache-buster, and the profiles update filtered to your own row. The
 * user id comes from the session, never from a caller.
 */
export async function uploadAvatarBytes({ buffer, type }) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const userId = sessionData.session?.user?.id
  if (!userId) {
    const notSignedIn = new Error('You are signed out. Sign in and try again.')
    notSignedIn.code = 'NOT_SIGNED_IN'
    throw notSignedIn
  }

  const path = `${userId}/avatar`
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { upsert: true, contentType: type, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: `${publicUrl}?v=${Date.now()}`, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, avatar_url, updated_at')
    .single()
  if (error) throw error
  return data
}
