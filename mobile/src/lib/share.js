import { Platform, Share } from 'react-native'

/**
 * Invite someone to the app — the ONLY place in this codebase that branches on
 * platform. Keep it that way: anything else that seems to need a
 * `Platform.select` belongs behind a module like this one, not inline in a
 * screen.
 *
 * Same rule as the web ShareButton: share the public link and fixed copy.
 * Never a habit name, a streak, an email or a token — the share sheet hands
 * the text to another app we do not control.
 *
 * Resolves to 'shared', 'dismissed' or 'unsupported'. The caller decides what
 * to show; this module never renders.
 */

// The deployed web app. EXPO_PUBLIC_ values are inlined into the bundle, so
// this must only ever hold a public URL.
const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? ''

const TITLE = 'Habit Tracker'
const TEXT = 'I’m building better habits one day at a time. Join me on Habit Tracker:'

async function shareOnWeb() {
  const data = { title: TITLE, text: TEXT, url: APP_URL }
  if (!navigator.share || (navigator.canShare && !navigator.canShare(data))) {
    return 'unsupported'
  }
  try {
    await navigator.share(data)
    return 'shared'
  } catch (error) {
    // Closing the sheet rejects with AbortError: the user changed their mind.
    if (error?.name === 'AbortError') return 'dismissed'
    throw error
  }
}

async function shareOnNative() {
  // The link goes inside `message`: Android ignores `url`, and iOS shares both
  // when both are set — so one field avoids a second platform branch.
  const result = await Share.share({ title: TITLE, message: `${TEXT} ${APP_URL}` })
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared'
}

export const shareApp = Platform.select({ web: shareOnWeb, default: shareOnNative })
