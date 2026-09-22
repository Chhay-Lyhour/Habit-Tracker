import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { friendlyProfileError, getProfile } from '@shared/profile'

import { useAuth } from '@/context/AuthProvider'
import { prepareAvatar, readAndValidate, uploadAvatarBytes } from '@/lib/avatar'

const ProfileContext = createContext(null)

/**
 * Native ProfileProvider: the header avatar and the profile screen share one
 * profile, so a new photo shows in both at once — same split as the web.
 */
export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    if (!userId) return
    const requestId = (requestRef.current += 1)
    setStatus('loading')
    try {
      const next = await getProfile()
      if (requestRef.current !== requestId) return
      setProfile(next)
      setError(null)
      setStatus('ready')
    } catch (caught) {
      if (requestRef.current !== requestId) return
      setError(friendlyProfileError(caught))
      setStatus('error')
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      load()
      return
    }
    requestRef.current += 1
    setProfile(null)
    setStatus('loading')
    setError(null)
  }, [userId, load])

  /**
   * Picked URI → resized JPEG → shared validateAvatar → upload. Throws a
   * user-facing message: validation failures say what is wrong with the
   * image, everything else goes through the web friendlyProfileError.
   */
  const uploadFromUri = useCallback(async (uri) => {
    try {
      const prepared = await prepareAvatar(uri)
      const bytes = await readAndValidate(prepared)
      const next = await uploadAvatarBytes(bytes)
      setProfile(next)
      return next
    } catch (caught) {
      throw new Error(
        caught?.code === 'INVALID_AVATAR' ? caught.message : friendlyProfileError(caught)
      )
    }
  }, [])

  const value = useMemo(
    () => ({ profile, status, error, reload: load, uploadFromUri }),
    [profile, status, error, load, uploadFromUri]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('useProfile must be used inside <ProfileProvider>')
  return value
}
