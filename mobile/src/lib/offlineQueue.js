import AsyncStorage from '@react-native-async-storage/async-storage'

import { createHabit, isNetworkError } from '@shared/habits'

import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * Offline queue for habit CREATION only — the native port of the web
 * src/lib/offlineQueue.js (audit leak 8: that one is built on localStorage
 * and window events, neither of which exists here).
 *
 * Same five rules, same enforcement:
 *
 *   Per user       Storage key includes the user id; syncQueue re-checks the
 *                  live session before every insert.
 *   No duplicates  Each item carries a uuid sent as the habit's primary key.
 *                  A replay that already landed fails with 23505 = synced.
 *                  Only one sync runs at a time.
 *   No loss        An item is removed only after its insert succeeds. A
 *                  network failure stops the run; any other failure is kept
 *                  with lastError for Retry / Discard.
 *   No owner claim user_id is never sent.
 *   Cleared        on sign-out (the profile screen, after asking).
 *
 * What differs: AsyncStorage is async, so a read-modify-write could
 * interleave with another one and lose an item. Every write goes through
 * `mutate`, which chains them one after another.
 * ============================================================================
 */

const KEY_PREFIX = 'habit-tracker:queue:'
const storageKey = (userId) => `${KEY_PREFIX}${userId}`

function isQueueItem(value) {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0
  )
}

/** Oldest first. A corrupt or missing entry reads as an empty queue. */
export async function readQueue(userId) {
  if (!userId) return []
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(storageKey(userId))) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isQueueItem) : []
  } catch {
    return []
  }
}

// Serialises every read-modify-write across the whole app.
let writeChain = Promise.resolve()

function mutate(userId, change) {
  const run = writeChain.then(async () => {
    const next = change(await readQueue(userId))
    if (next.length === 0) await AsyncStorage.removeItem(storageKey(userId))
    else await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next))
    return next
  })
  // A failed write must not jam every later one.
  writeChain = run.catch(() => {})
  return run
}

export function enqueueHabit(userId, { id, title, description }) {
  return mutate(userId, (items) => [
    ...items,
    { id, title, description: description ?? null, queuedAt: new Date().toISOString() },
  ])
}

export function discardQueued(userId, itemId) {
  return mutate(userId, (items) => items.filter((item) => item.id !== itemId))
}

/** Clears lastError so the item is retried on the next sync. */
export function resetQueued(userId, itemId) {
  return mutate(userId, (items) =>
    items.map((item) => (item.id === itemId ? { ...item, lastError: undefined } : item))
  )
}

function markFailed(userId, itemId, message) {
  return mutate(userId, (items) =>
    items.map((item) => (item.id === itemId ? { ...item, lastError: message } : item))
  )
}

export async function clearQueue(userId) {
  if (!userId) return
  await writeChain
  await AsyncStorage.removeItem(storageKey(userId))
}

async function sessionUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

let inFlight = null

/**
 * Replays the user's queue, oldest first, one insert at a time. Items that
 * already failed for a non-network reason are skipped until reset (Retry).
 * Resolves to { synced, failed, remaining }. Never rejects.
 */
export function syncQueue(userId) {
  if (inFlight) return inFlight

  inFlight = (async () => {
    let synced = 0
    let failed = 0

    try {
      for (const item of await readQueue(userId)) {
        if (item.lastError) continue
        // The user may sign out, or another account sign in, mid-run.
        if ((await sessionUserId()) !== userId) break

        try {
          await createHabit({ id: item.id, title: item.title, description: item.description })
          await discardQueued(userId, item.id)
          synced += 1
        } catch (error) {
          if (error?.code === '23505') {
            await discardQueued(userId, item.id)
            synced += 1
          } else if (isNetworkError(error)) {
            break
          } else {
            await markFailed(userId, item.id, error?.message ?? 'Unknown error')
            failed += 1
          }
        }
      }
    } finally {
      inFlight = null
    }

    return { synced, failed, remaining: (await readQueue(userId)).length }
  })()

  return inFlight
}
