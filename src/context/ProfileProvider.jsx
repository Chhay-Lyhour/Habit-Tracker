import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { getProfile, uploadAvatar } from '@/lib/profile'
import { ProfileContext } from '@/context/profile-context'

/**
 * Owns the signed-in user's profile, so the header avatar and the uploader
 * read the same state — upload in one, and the other updates at once.
 *
 * Mounted inside the protected route, so it only exists while someone is
 * signed in; signing out unmounts it and the state goes with it.
 *
 * Same rule as useHabits: the server is the truth, this is a cache of it.
 */
export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Monotonic id so a slow response cannot overwrite a newer one, and so
  // nothing is written after unmount.
  const requestRef = useRef(0)
  useEffect(() => () => { requestRef.current += 1 }, [])

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (!userId) return

      const requestId = (requestRef.current += 1)
      if (!quiet) setStatus('loading')

      try {
        const next = await getProfile()
        if (requestRef.current !== requestId) return

        setProfile(next)
        setError(null)
        setStatus('ready')
      } catch (caught) {
        if (requestRef.current !== requestId) return
        setError(caught)
        setStatus('error')
      }
    },
    [userId]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount, not a cascading render
    refresh({ quiet: true })
  }, [refresh])

  /** Throws on failure — the caller shows the message and a Retry. */
  const upload = useCallback(async (file) => {
    setUploading(true)
    try {
      const next = await uploadAvatar(file)
      // Invalidate any read still in flight: it would carry the old URL.
      requestRef.current += 1
      setProfile(next)
      setError(null)
      setStatus('ready')
      return next
    } finally {
      setUploading(false)
    }
  }, [])

  const value = useMemo(
    () => ({ profile, status, error, uploading, refresh, upload }),
    [profile, status, error, uploading, refresh, upload]
  )

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  )
}
