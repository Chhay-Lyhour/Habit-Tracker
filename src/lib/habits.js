/* eslint-disable no-unused-vars -- see HAND-WRITE note below */

// userId, habitId and date are reported unused only because the HAND-WRITE
// filters below are not written yet; each one is the argument its filter
// needs. Once every marker is filled in, delete the disable line above — if
// anything is still reported unused then, you have missed a filter.

import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * All habit data access lives here. Nothing else in the app talks to the
 * habits or daily_logs tables.
 *
 * HAND-WRITE ZONE — every query below is complete except its filter. Each
 * `// HAND-WRITE:` comment names what the filter has to target. Fill them in.
 *
 * Why this is worth doing carefully, and it differs per operation:
 *
 *   READS (listHabits, listLogsSince)
 *     A missing filter is not dangerous. RLS already scopes SELECT to rows
 *     you own, so the worst case is that you asked for more than you needed
 *     and got your own rows back anyway. The filter is defence in depth —
 *     the query should say what it means, not lean on the database to mean
 *     it for you.
 *
 *   WRITES (updateHabit, deleteHabit, unlogHabitToday)
 *     A missing filter IS dangerous, and RLS will not save you. RLS narrows
 *     the statement to rows you own — and rows you own are precisely the ones
 *     that get updated or deleted. `delete from habits` with no .eq() removes
 *     every habit you have, and RLS permits it, because you owned all of them.
 *
 *     That is the whole lesson: RLS stops other people touching your rows. It
 *     does nothing about you touching too many of your own.
 *
 *     ⚠ These functions run exactly as written. Until the filters are in,
 *     deleting one habit deletes all of them, and unticking one day clears
 *     every log you have. Fill the markers before using the app for anything
 *     you would mind losing.
 * ============================================================================
 */

const HABIT_FIELDS = 'id, title, description, is_active, created_at'
const LOG_FIELDS = 'id, habit_id, log_date, completed'

/**
 * Today as YYYY-MM-DD in the browser's own timezone.
 *
 * Deliberately not left to the log_date column default: that default is
 * current_date on the database, which is UTC. For anyone far enough from UTC
 * the two disagree for part of the day, and a habit ticked at 9pm would land
 * on tomorrow's row. The client knows which day it is for the user, so the
 * client sends it.
 */
export function todayISO() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** Same thing, n days back. */
export function isoDaysAgo(days) {
  const now = new Date()
  now.setDate(now.getDate() - days)
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/**
 * Turns Postgres error codes into something a person can act on.
 *
 * 42501 is the one you will meet most while the policies are being written —
 * it means RLS refused the statement, not that the app is broken.
 */
export function friendlyDataError(error) {
  switch (error?.code) {
    case '42501':
      return 'The database refused that. Your RLS policies are not allowing it — check supabase/policies.sql.'
    case '23505':
      return 'That day is already logged for this habit.'
    case '23514':
      return 'That does not fit — check the length of the name and note.'
    case '23503':
      return 'That habit no longer exists. Refresh and try again.'
    case 'PGRST205':
      return 'The tables are missing. Run supabase/schema.sql in the SQL editor.'
    default:
      return error?.message || 'Something went wrong. Try again.'
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listHabits(userId) {
  const { data, error } = await supabase
    .from('habits')
    .select(HABIT_FIELDS)
    // HAND-WRITE: .eq('user_id', userId)
    // Scope the read to the signed-in user. RLS would do this anyway, so a
    // missing filter here is harmless — but a query should state its own
    // intent rather than depend on the database to enforce it.
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Logs from `sinceDate` onwards. One request covers both jobs: deciding what
 * is ticked today, and counting each habit's streak.
 */
export async function listLogsSince(userId, sinceDate) {
  const { data, error } = await supabase
    .from('daily_logs')
    .select(LOG_FIELDS)
    // HAND-WRITE: .eq('user_id', userId)
    // Same reasoning as listHabits — defence in depth, not the real guard.
    .gte('log_date', sinceDate)
    .order('log_date', { ascending: false })

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * No filter needed — an INSERT has no existing row to narrow down.
 *
 * Note what is NOT sent: user_id. The column defaults to auth.uid(), so the
 * database stamps the owner from the request's JWT. A client that sent its own
 * user_id would be asserting who it is, which is exactly what your INSERT
 * policy's WITH CHECK refuses to take on trust.
 */
export async function createHabit({ title, description }) {
  const { data, error } = await supabase
    .from('habits')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
    })
    .select(HABIT_FIELDS)
    .single()

  if (error) throw error
  return data
}

export async function updateHabit(habitId, patch) {
  const { data, error } = await supabase
    .from('habits')
    .update(patch)
    // HAND-WRITE: .eq('id', habitId)
    // Must target this one habit's id. Without it every habit you own is
    // rewritten with the same patch, and RLS allows it — they are all yours.
    .select(HABIT_FIELDS)
    .single()

  if (error) throw error
  return data
}

export async function deleteHabit(habitId) {
  const { error } = await supabase
    .from('habits')
    .delete()
    // HAND-WRITE: .eq('id', habitId)
    // The most destructive filter in the file. Missing, this empties your
    // habits table — and cascades every daily_log with it.

  if (error) throw error
}

/**
 * Tick a habit for a given day.
 *
 * upsert, not insert: ticking twice must not fail or duplicate. The conflict
 * target is the unique (habit_id, log_date) constraint from schema.sql, so a
 * second tick updates the existing row instead of colliding with it.
 *
 * That also means this path needs BOTH your INSERT and UPDATE policies on
 * daily_logs to pass — the first tick inserts, later ones update.
 *
 * user_id is omitted again, for the same reason as createHabit.
 */
export async function logHabitToday(habitId, date = todayISO()) {
  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      { habit_id: habitId, log_date: date, completed: true },
      { onConflict: 'habit_id,log_date' }
    )
    .select(LOG_FIELDS)
    .single()

  if (error) throw error
  return data
}

/** Untick a habit: remove the day's row rather than flipping completed. */
export async function unlogHabitToday(habitId, date = todayISO()) {
  const { error } = await supabase
    .from('daily_logs')
    .delete()
    // HAND-WRITE: .eq('habit_id', habitId)
    // HAND-WRITE: .eq('log_date', date)
    // Two filters, and both matter. With only habit_id you erase that habit's
    // entire history instead of one day. With only log_date you erase that day
    // across every habit you own. With neither, every log you have.

  if (error) throw error
}
