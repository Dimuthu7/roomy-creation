import { describe, it, expect } from 'vitest'
import { currentMonth, formatMonthLabel, monthRange, parseMonth, recentMonths } from './month'

describe('currentMonth', () => {
  it('formats as YYYY-MM with a padded month', () => {
    expect(currentMonth(new Date(2026, 8, 24))).toBe('2026-09')
  })

  it('pads a single-digit month', () => {
    expect(currentMonth(new Date(2026, 0, 5))).toBe('2026-01')
  })
})

describe('parseMonth', () => {
  it('parses a well-formed month', () => {
    expect(parseMonth('2026-09')).toEqual({ year: 2026, month: 9 })
  })

  it('returns null for a month outside 1-12', () => {
    expect(parseMonth('2026-13')).toBeNull()
    expect(parseMonth('2026-00')).toBeNull()
  })

  it('returns null for anything not YYYY-MM', () => {
    expect(parseMonth('2026-9')).toBeNull()
    expect(parseMonth('2026-09-01')).toBeNull()
    expect(parseMonth('')).toBeNull()
    expect(parseMonth('nonsense')).toBeNull()
  })
})

describe('monthRange', () => {
  it('spans a 30-day month', () => {
    expect(monthRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
  })

  it('spans a 31-day month', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' })
  })

  it('handles February in a leap year', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
  })

  it('handles February in a non-leap year', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('returns null for an unparseable month', () => {
    expect(monthRange('2026-13')).toBeNull()
  })
})

describe('formatMonthLabel', () => {
  it('names the month', () => {
    expect(formatMonthLabel('2026-09')).toBe('September 2026')
  })

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(formatMonthLabel('whenever')).toBe('whenever')
  })
})

describe('recentMonths', () => {
  it('lists months newest first', () => {
    expect(recentMonths(3, new Date(2026, 8, 24))).toEqual(['2026-09', '2026-08', '2026-07'])
  })

  it('rolls back across a year boundary', () => {
    expect(recentMonths(3, new Date(2026, 0, 15))).toEqual(['2026-01', '2025-12', '2025-11'])
  })

  it('returns an empty list for a count of zero', () => {
    expect(recentMonths(0, new Date(2026, 8, 24))).toEqual([])
  })
})
