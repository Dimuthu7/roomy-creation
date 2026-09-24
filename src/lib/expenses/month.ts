// A month is a 'YYYY-MM' string and a date is a 'YYYY-MM-DD' string, for the same
// reason listJobs compares date bounds as plain strings: in those formats
// lexicographic order IS chronological order, so no Date object is needed to filter,
// sort or compare. Date objects appear here only to ask the calendar how long a month
// is, and always in UTC so a machine in any timezone computes the same boundaries.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
}

export function parseMonth(month: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return null
  const year = Number(match[1])
  const monthNumber = Number(match[2])
  if (monthNumber < 1 || monthNumber > 12) return null
  return { year, month: monthNumber }
}

/** Inclusive bounds, so a query uses gte(start) and lte(end) — matching how
 *  listJobs treats its `from`/`to` filters. */
export function monthRange(month: string): { start: string; end: string } | null {
  const parsed = parseMonth(month)
  if (!parsed) return null
  // Day 0 of the FOLLOWING month is the last day of this one — the standard trick,
  // and the only leap-year rule that is never wrong.
  const lastDay = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate()
  const prefix = `${parsed.year}-${pad2(parsed.month)}`
  return { start: `${prefix}-01`, end: `${prefix}-${pad2(lastDay)}` }
}

export function formatMonthLabel(month: string): string {
  const parsed = parseMonth(month)
  if (!parsed) return month
  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`
}

/** Newest first. Used to populate the month filter without querying the table for
 *  which months actually have rows — a fixed recent window is enough and costs
 *  nothing. */
export function recentMonths(count: number, now: Date = new Date()): string[] {
  const months: string[] = []
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  for (let i = 0; i < count; i++) {
    months.push(`${year}-${pad2(month)}`)
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return months
}
