import { createHabit, isNetworkError } from '@/lib/habits'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * Offline queue for habit CREATION only.
 *
 * A habit added while offline is written to localStorage and shown in the
 * list as "Queued". When the browser comes back online (or the app starts
 * online with items waiting), syncQueue() replays them through createHabit.
 *
 * The rules, and what enforces each:
 *
 *   Per user       The storage key includes the user id. One user's queue is
 *                  never read, shown or synced under another user's session;
 *                  syncQueue re-checks the live session before every insert.
 *
 *   No duplicates  Every item gets a uuid when it is queued, and that uuid is
 *                  sent as the habit's primary key. Replaying an item that
 *                  already landed fails with 23505, which counts as success.
 *                  That holds across two tabs, a crash mid-sync, anything.
 *                  On top, only one sync runs at a time in this tab.
 *
 *   No loss        An item is removed only after its insert succeeds. A
 *                  network failure stops the run and leaves the rest queued;
 *                  any other failure is kept with its error for a retry.
 *
 *   No owner claim user_id is never sent. The column default (auth.uid()) and
 *                  the INSERT policy apply exactly as for an online insert.
 *
 * Cleared on sign-out (AuthProvider.signOut).
 * ============================================================================
 */

const KEY_PREFIX = 'habit-tracker:queue:'

/** Fired on window whenever this tab changes a queue, so every view re-reads. */
export const QUEUE_EVENT = 'habit-queue-change'

function storageKey(userId) {
  return `${KEY_PREFIX}${userId}`
}

function isQueueItem(value) {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0
  )
}

/**
 * The raw stored string, for useSyncExternalStore: a string compares by value,
 * so React only re-renders when the queue actually changed.
 */
export function queueSnapshot(userId) {
  if (!userId) return ''
  try {
    return localStorage.getItem(storageKey(userId)) ?? ''
  } catch {
    return ''
  }
}

/** Parses a snapshot. Never throws — bad data reads as an empty queue. */
export function parseQueue(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isQueueItem) : []
  } catch {
    return []
  }
}

/** The user's queue, oldest first. */
export function readQueue(userId) {
  return parseQueue(queueSnapshot(userId))
}

function writeQueue(userId, items) {
  try {
    if (items.length === 0) localStorage.removeItem(storageKey(userId))
    else localStorage.setItem(storageKey(userId), JSON.stringify(items))
  } catch {
    // Storage full or blocked. The caller has already told the user it
    // queued; there is nowhere better to put it.
  }
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: { userId } }))
}

/**
 * Adds a habit to the user's queue and returns the stored item.
 *
 * Pass `id` when an online insert with that id was already attempted: the
 * request may have reached the server even though the response was lost, and
 * reusing the id turns that case into a harmless 23505 instead of a duplicate.
 */
export function enqueueHabit(userId, { id, title, description }) {
  if (!userId) throw new Error('Cannot queue a habit without a signed-in user.')

  const item = {
    id: id ?? crypto.randomUUID(),
    title: title.trim(),
    description: description?.trim() || null,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  }
  writeQueue(userId, [...readQueue(userId), item])
  return item
}

/** Lets the user drop a queued habit that keeps failing. */
export function discardQueued(userId, itemId) {
  removeItem(userId, itemId)
}

function removeItem(userId, itemId) {
  writeQueue(
    userId,
    readQueue(userId).filter((item) => item.id !== itemId)
  )
}

function markFailed(userId, itemId, message) {
  writeQueue(
    userId,
    readQueue(userId).map((item) =>
      item.id === itemId
        ? { ...item, attempts: item.attempts + 1, lastError: message }
        : item
    )
  )
}

/** Drops the user's whole queue. Called on sign-out. */
export function clearQueue(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // Nothing else to do.
  }
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: { userId } }))
}

async function sessionUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

// One run at a time per tab. A second call while one is in flight gets the
// same promise instead of starting a parallel replay.
let inFlight = null

/**
 * Replays the user's queue, oldest first, one insert at a time.
 *
 * Resolves to { synced, failed, remaining }. Never rejects.
 */
export function syncQueue(userId) {
  if (inFlight) return inFlight

  inFlight = (async () => {
    let synced = 0
    let failed = 0

    try {
      for (const item of readQueue(userId)) {
        // Re-checked every time: the user may sign out, or another account
        // sign in, part-way through a slow run.
        if ((await sessionUserId()) !== userId) break

        try {
          await createHabit({
            id: item.id,
            title: item.title,
            description: item.description,
          })
          removeItem(userId, item.id)
          synced += 1
        } catch (error) {
          if (error?.code === '23505') {
            // Already inserted by an earlier run that did not get to remove
            // it. It is on the server; drop it from the queue.
            removeItem(userId, item.id)
            synced += 1
          } else if (isNetworkError(error)) {
            // Still offline, whatever navigator.onLine says. Stop; everything
            // left stays queued for the next "online" event.
            break
          } else {
            markFailed(userId, item.id, error?.message ?? 'Unknown error')
            failed += 1
          }
        }
      }
    } finally {
      inFlight = null
    }

    return { synced, failed, remaining: readQueue(userId).length }
  })()

  return inFlight
}
