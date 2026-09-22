import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { useAuth } from '@/hooks/useAuth'
import {
  createHabit,
  deleteHabit,
  isNetworkError,
  isoDaysAgo,
  listHabits,
  listLogsSince,
  logHabitToday,
  todayISO,
  unlogHabitToday,
  updateHabit,
} from '@/lib/habits'
import {
  QUEUE_EVENT,
  discardQueued,
  enqueueHabit,
  parseQueue,
  queueSnapshot,
  readQueue,
  syncQueue,
} from '@/lib/offlineQueue'
import { summariseLogs } from '@/lib/streaks'

// Re-read the queue when this tab changes it (QUEUE_EVENT) or another tab
// does ('storage' only fires in the OTHER tabs).
function subscribeToQueue(onChange) {
  window.addEventListener(QUEUE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(QUEUE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/**
 * How far back to fetch logs. Long enough for any streak worth showing,
 * short enough that the request stays small as history builds up.
 */
const STREAK_WINDOW_DAYS = 120

/**
 * Owns the habit list and everything that changes it.
 *
 * The rule this follows: the server is the truth. State here is a cache of
 * what Supabase returned, never the place a change is recorded. Every mutation
 * ends in a refetch, so a page refresh can never lose or disagree with
 * anything — which is exactly what the audit checks.
 *
 * Ticking a habit updates optimistically first, because waiting on a round
 * trip makes the tick feel broken. It rolls back if the write fails.
 *
 * Creating is the one action that works offline: it lands in the offline
 * queue (src/lib/offlineQueue.js) and syncs on the "online" event and on
 * start-up. `onQueueSynced({ synced, failed, remaining })` is called after
 * each sync that had something to do, so the page can toast about it.
 */
export function useHabits({ onQueueSynced } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const queueRaw = useSyncExternalStore(subscribeToQueue, () =>
    queueSnapshot(userId)
  )
  const queued = useMemo(() => parseQueue(queueRaw), [queueRaw])

  // Latest callback without re-subscribing the "online" listener every render.
  const onSyncedRef = useRef(onQueueSynced)
  useEffect(() => {
    onSyncedRef.current = onQueueSynced
  })

  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)

  // Per-habit spinner for the tick button, and a single flag for the dialogs.
  const [busyHabitIds, setBusyHabitIds] = useState(() => new Set())
  const [saving, setSaving] = useState(false)

  // Monotonic id so a slow response from an earlier refresh cannot overwrite
  // a newer one, and so nothing is written after unmount.
  const requestRef = useRef(0)
  useEffect(() => () => { requestRef.current += 1 }, [])

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (!userId) return

      const requestId = (requestRef.current += 1)
      if (!quiet) setStatus('loading')

      try {
        const [nextHabits, nextLogs] = await Promise.all([
          listHabits(userId),
          listLogsSince(userId, isoDaysAgo(STREAK_WINDOW_DAYS)),
        ])

        if (requestRef.current !== requestId) return

        setHabits(nextHabits)
        setLogs(nextLogs)
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

  // Fetching on mount is the one thing Effects are still for. `quiet` skips
  // the redundant setStatus('loading') — status already starts there — which
  // keeps the mount from writing state before its first paint.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount, not a cascading render
    refresh({ quiet: true })
  }, [refresh])

  const today = todayISO()
  const { doneToday, streaks } = useMemo(
    () => summariseLogs(logs, today),
    [logs, today]
  )

  function markBusy(habitId, busy) {
    setBusyHabitIds((current) => {
      const next = new Set(current)
      if (busy) next.add(habitId)
      else next.delete(habitId)
      return next
    })
  }

  const toggleToday = useCallback(
    async (habit, completed) => {
      const snapshot = logs
      markBusy(habit.id, true)

      // Optimistic: show the tick immediately.
      setLogs((current) =>
        completed
          ? [
              ...current,
              {
                id: `optimistic:${habit.id}:${today}`,
                habit_id: habit.id,
                log_date: today,
                completed: true,
              },
            ]
          : current.filter(
              (log) => !(log.habit_id === habit.id && log.log_date === today)
            )
      )

      try {
        if (completed) await logHabitToday(habit.id, today)
        else await unlogHabitToday(habit.id, today)

        // Replace the optimistic row with what the server actually stored.
        await refresh({ quiet: true })
      } catch (caught) {
        setLogs(snapshot)
        throw caught
      } finally {
        markBusy(habit.id, false)
      }
    },
    [logs, today, refresh]
  )

  /**
   * Resolves to { queued: boolean }. Queues instead of inserting when the
   * browser says it is offline, AND when an attempted insert fails with a
   * network error — navigator.onLine === true does not prove a connection.
   *
   * The id is generated up front and reused if the habit ends up queued: a
   * request can reach the server even though its response never came back,
   * and the shared id makes the later replay a no-op rather than a duplicate.
   */
  const create = useCallback(
    async (values) => {
      const id = crypto.randomUUID()

      if (!navigator.onLine) {
        enqueueHabit(userId, { ...values, id })
        return { queued: true }
      }

      setSaving(true)
      try {
        await createHabit({ ...values, id })
      } catch (caught) {
        if (!isNetworkError(caught)) throw caught
        enqueueHabit(userId, { ...values, id })
        return { queued: true }
      } finally {
        setSaving(false)
      }

      await refresh({ quiet: true })
      return { queued: false }
    },
    [refresh, userId]
  )

  /**
   * Replays the queue if there is anything to replay and we look online.
   * Safe to call any number of times: syncQueue runs one pass at a time and
   * the per-item id makes a repeated insert a no-op.
   */
  const syncNow = useCallback(async () => {
    if (!userId || !navigator.onLine) return null
    if (readQueue(userId).length === 0) return null

    const result = await syncQueue(userId)
    if (result.synced > 0) await refresh({ quiet: true })
    onSyncedRef.current?.(result)
    return result
  }, [userId, refresh])

  // On start-up (if online with items waiting) and on every "online" event.
  useEffect(() => {
    const handleOnline = () => {
      syncNow()
    }
    handleOnline()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncNow])

  const discard = useCallback(
    (itemId) => discardQueued(userId, itemId),
    [userId]
  )

  const update = useCallback(
    async (habitId, patch) => {
      setSaving(true)
      try {
        await updateHabit(habitId, patch)
        await refresh({ quiet: true })
      } finally {
        setSaving(false)
      }
    },
    [refresh]
  )

  const remove = useCallback(
    async (habitId) => {
      setSaving(true)
      try {
        await deleteHabit(habitId)
        await refresh({ quiet: true })
      } finally {
        setSaving(false)
      }
    },
    [refresh]
  )

  return {
    habits,
    doneToday,
    streaks,
    status,
    error,
    saving,
    busyHabitIds,
    queued,
    refresh,
    toggleToday,
    create,
    update,
    remove,
    syncNow,
    discard,
  }
}
