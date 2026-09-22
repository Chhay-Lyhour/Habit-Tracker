import { randomUUID } from 'expo-crypto'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// The web app's data layer and streak rules, imported unchanged.
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
} from '@shared/habits'
import { summariseLogs } from '@shared/streaks'

import { useAuth } from '@/context/AuthProvider'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  clearQueue,
  discardQueued,
  enqueueHabit,
  readQueue,
  resetQueued,
  syncQueue,
} from '@/lib/offlineQueue'

// Same window as the web useHabits: enough history to count a long streak.
const STREAK_WINDOW_DAYS = 120

const HabitsContext = createContext(null)

/**
 * The native useHabits: one copy of the habits, logs and offline queue,
 * shared by every screen — so a change on one is on the others without a
 * refetch.
 *
 * Mutations throw; the screen that called them decides how to show the error.
 * `notice` is the native stand-in for the web's toasts: one short line the
 * list shows and clears.
 */
export function HabitsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const online = useOnlineStatus()

  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [queued, setQueued] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [notice, setNotice] = useState(null)

  // Monotonic id: a slow earlier response must not overwrite a newer one,
  // and a response for a signed-out user must not land at all.
  const requestRef = useRef(0)

  // Latest logs for the toggle rollback, without making toggle depend on them.
  const logsRef = useRef(logs)
  useEffect(() => {
    logsRef.current = logs
  })

  const load = useCallback(
    async ({ pull = false, quiet = false } = {}) => {
      if (!userId) return
      const requestId = (requestRef.current += 1)
      if (pull) setRefreshing(true)
      else if (!quiet) setStatus('loading')

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
        // A quiet background refresh keeps what is on screen.
        if (quiet) return
        setError(caught)
        setStatus('error')
      } finally {
        if (requestRef.current === requestId) setRefreshing(false)
      }
    },
    [userId]
  )

  const reloadQueue = useCallback(async () => {
    setQueued(await readQueue(userId))
  }, [userId])

  // Load for a new user; drop everything on sign-out so the next account
  // never sees the previous one's habits, even for a frame.
  useEffect(() => {
    if (userId) {
      load()
      reloadQueue()
      return
    }
    requestRef.current += 1
    setHabits([])
    setLogs([])
    setQueued([])
    setStatus('loading')
    setError(null)
    setNotice(null)
  }, [userId, load, reloadQueue])

  /**
   * Replays the queue when there is something to replay and we look online.
   * Safe to call any number of times — one run at a time, and the per-item id
   * makes a repeated insert a no-op.
   */
  const syncNow = useCallback(async () => {
    if (!userId) return
    if ((await readQueue(userId)).length === 0) return

    const result = await syncQueue(userId)
    await reloadQueue()
    if (result.synced > 0) {
      await load({ quiet: true })
      setNotice(
        `Back online. Synced ${result.synced} habit${result.synced === 1 ? '' : 's'}.`
      )
    }
    if (result.failed > 0) {
      setNotice('Some habits couldn’t be saved. Retry or discard them below.')
    }
  }, [userId, reloadQueue, load])

  // On start-up (if online with items waiting) and every time we reconnect.
  useEffect(() => {
    if (online) syncNow()
  }, [online, syncNow])

  /**
   * Optimistic, like the web toggleToday: the tick shows at once, then the
   * server's row replaces the placeholder — or, on failure, only THIS
   * habit's day is put back (not a whole-list snapshot, which could undo a
   * second tick made in the meantime).
   */
  const toggle = useCallback(async (habit, nextCompleted) => {
    const date = todayISO()
    const sameDay = (l) => l.habit_id === habit.id && l.log_date === date
    const previous = logsRef.current.find(sameDay) ?? null

    setPendingIds((prev) => new Set(prev).add(habit.id))
    setLogs((prev) => {
      const rest = prev.filter((l) => !sameDay(l))
      return nextCompleted
        ? [
            {
              id: `optimistic:${habit.id}:${date}`,
              habit_id: habit.id,
              log_date: date,
              completed: true,
            },
            ...rest,
          ]
        : rest
    })

    try {
      if (nextCompleted) {
        const log = await logHabitToday(habit.id, date)
        setLogs((prev) => [log, ...prev.filter((l) => !sameDay(l))])
      } else {
        await unlogHabitToday(habit.id, date)
      }
    } catch (caught) {
      setLogs((prev) => {
        const rest = prev.filter((l) => !sameDay(l))
        return previous ? [previous, ...rest] : rest
      })
      throw caught
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(habit.id)
        return next
      })
    }
  }, [])

  /**
   * Resolves to { queued: boolean }. Queues when offline, AND when an insert
   * fails with a network error — "connected" does not prove a connection.
   * The id is made up front and reused if it ends up queued: a request can
   * reach the server even though its response never came back, and the
   * shared id turns the later replay into a no-op instead of a duplicate.
   */
  const create = useCallback(
    async (fields) => {
      const id = randomUUID()
      const queue = async () => {
        await enqueueHabit(userId, { ...fields, id })
        await reloadQueue()
        setNotice('Saved offline, will sync when you’re back online.')
        return { queued: true }
      }

      if (!online) return queue()

      try {
        const habit = await createHabit({ ...fields, id })
        setHabits((prev) => [...prev, habit])
        setNotice('Nice! Habit added.')
        return { queued: false }
      } catch (caught) {
        if (!isNetworkError(caught)) throw caught
        return queue()
      }
    },
    [userId, online, reloadQueue]
  )

  const update = useCallback(async (habitId, patch) => {
    const habit = await updateHabit(habitId, patch)
    setHabits((prev) => prev.map((h) => (h.id === habitId ? habit : h)))
    setNotice('Saved.')
    return habit
  }, [])

  const remove = useCallback(async (habitId) => {
    await deleteHabit(habitId)
    // The database cascade removed the logs; mirror it locally.
    setHabits((prev) => prev.filter((h) => h.id !== habitId))
    setLogs((prev) => prev.filter((l) => l.habit_id !== habitId))
    setNotice('Habit deleted.')
  }, [])

  const retryQueued = useCallback(
    async (itemId) => {
      await resetQueued(userId, itemId)
      await reloadQueue()
      await syncNow()
    },
    [userId, reloadQueue, syncNow]
  )

  const discard = useCallback(
    async (itemId) => {
      await discardQueued(userId, itemId)
      await reloadQueue()
    },
    [userId, reloadQueue]
  )

  /** Call BEFORE signOut: afterwards there is no user id to clear. */
  const clearQueued = useCallback(async () => {
    await clearQueue(userId)
    setQueued([])
  }, [userId])

  const clearNotice = useCallback(() => setNotice(null), [])

  const today = todayISO()
  const { doneToday, streaks } = useMemo(() => summariseLogs(logs, today), [logs, today])

  const value = useMemo(
    () => ({
      habits,
      queued,
      status,
      error,
      refreshing,
      pendingIds,
      doneToday,
      streaks,
      notice,
      load,
      toggle,
      create,
      update,
      remove,
      retryQueued,
      discard,
      clearQueued,
      clearNotice,
    }),
    [
      habits,
      queued,
      status,
      error,
      refreshing,
      pendingIds,
      doneToday,
      streaks,
      notice,
      load,
      toggle,
      create,
      update,
      remove,
      retryQueued,
      discard,
      clearQueued,
      clearNotice,
    ]
  )

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
}

export function useHabits() {
  const value = useContext(HabitsContext)
  if (!value) throw new Error('useHabits must be used inside <HabitsProvider>')
  return value
}
