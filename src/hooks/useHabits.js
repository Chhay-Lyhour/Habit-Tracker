import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import {
  createHabit,
  deleteHabit,
  isoDaysAgo,
  listHabits,
  listLogsSince,
  logHabitToday,
  todayISO,
  unlogHabitToday,
  updateHabit,
} from '@/lib/habits'
import { summariseLogs } from '@/lib/streaks'

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
 */
export function useHabits() {
  const { user } = useAuth()
  const userId = user?.id ?? null

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

  const create = useCallback(
    async (values) => {
      setSaving(true)
      try {
        await createHabit(values)
        await refresh({ quiet: true })
      } finally {
        setSaving(false)
      }
    },
    [refresh]
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
    refresh,
    toggleToday,
    create,
    update,
    remove,
  }
}
