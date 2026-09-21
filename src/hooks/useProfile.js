import { useContext } from 'react'

import { ProfileContext } from '@/context/profile-context'

export function useProfile() {
  const context = useContext(ProfileContext)

  if (context === null) {
    throw new Error('useProfile must be used inside <ProfileProvider>.')
  }

  return context
}
