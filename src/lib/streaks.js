/**
 * Streak counting, kept as pure functions so the rules are easy to read and
 * easy to change.
 */

function isoDaysBefore(iso, days) {
  const [year, month, day] = iso.split('-').map(Number)
  // Month is 0-indexed, and Date normalises overflow, so this handles month
  // and year boundaries without special cases.
  const date = new Date(year, month - 1, day - days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Consecutive completed days ending today or yesterday.
 *
 * Yesterday counts as a live streak on purpose: a habit you have not yet done
 * today is not broken, it is pending. Requiring today would show every streak
 * as zero each morning, which is both wrong and discouraging. Miss a whole
 * day and it drops to zero.
 */
export function streakFor(completedDates, today) {
  if (completedDates.size === 0) return 0

  let cursor = completedDates.has(today) ? today : isoDaysBefore(today, 1)
  if (!completedDates.has(cursor)) return 0

  let streak = 0
  while (completedDates.has(cursor)) {
    streak += 1
    cursor = isoDaysBefore(cursor, 1)
  }
  return streak
}

/**
 * Turns a flat list of log rows into what the list needs: which habits are
 * done today, and how long each streak is.
 */
export function summariseLogs(logs, today) {
  const byHabit = new Map()

  for (const log of logs) {
    if (!log.completed) continue
    if (!byHabit.has(log.habit_id)) byHabit.set(log.habit_id, new Set())
    byHabit.get(log.habit_id).add(log.log_date)
  }

  const doneToday = new Set()
  const streaks = new Map()

  for (const [habitId, dates] of byHabit) {
    if (dates.has(today)) doneToday.add(habitId)
    streaks.set(habitId, streakFor(dates, today))
  }

  return { doneToday, streaks }
}
