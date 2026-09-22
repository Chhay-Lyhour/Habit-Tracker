import NetInfo from '@react-native-community/netinfo'
import { useEffect, useState } from 'react'

/**
 * Native twin of the web useOnlineStatus (which reads navigator.onLine and
 * window online/offline events — neither exists on native; audit leak 9).
 *
 * `isInternetReachable` is null until NetInfo has actually probed, so only an
 * explicit `false` counts as offline — same rule as the web: never claim
 * offline without evidence.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true)

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false)
      }),
    []
  )

  return online
}
