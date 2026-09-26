import { describe, it, expect } from 'vitest'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_KEYS,
  isExpenseCategory,
  type ExpenseFieldKind,
} from './categories'

const KNOWN_KINDS: ExpenseFieldKind[] = ['text', 'textarea', 'money', 'date', 'radio', 'select', 'shop']

describe('the registry', () => {
  it('has an entry for every key, keyed consistently', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      expect(EXPENSE_CATEGORIES[key].key).toBe(key)
    }
    expect(Object.keys(EXPENSE_CATEGORIES).sort()).toEqual([...EXPENSE_CATEGORY_KEYS].sort())
  })

  // This is the guard that a half-added future category fails a test rather than
  // crashing the form in production.
  it('gives every category a label, fields and a summary', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      const def = EXPENSE_CATEGORIES[key]
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.fields.length).toBeGreaterThan(0)
      expect(typeof def.summary).toBe('function')
    }
  })

  it('uses only field kinds the form knows how to render', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      for (const field of EXPENSE_CATEGORIES[key].fields) {
        expect(KNOWN_KINDS).toContain(field.kind)
      }
    }
  })

  it('gives every field a unique name within its category', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      const names = EXPENSE_CATEGORIES[key].fields.map((f) => f.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('gives every category a date field named spentAt and a remark field', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      const fields = EXPENSE_CATEGORIES[key].fields
      expect(fields.some((f) => f.name === 'spentAt' && f.kind === 'date')).toBe(true)
      expect(fields.some((f) => f.name === 'remark')).toBe(true)
    }
  })

  it('has exactly one money field per category except material, which has two', () => {
    const moneyCount = (key: (typeof EXPENSE_CATEGORY_KEYS)[number]) =>
      EXPENSE_CATEGORIES[key].fields.filter((f) => f.kind === 'money').length
    expect(moneyCount('material')).toBe(2)
    expect(moneyCount('salary')).toBe(1)
    expect(moneyCount('business_capital')).toBe(1)
    expect(moneyCount('transport')).toBe(1)
  })
})

describe('isExpenseCategory', () => {
  it('accepts a known key', () => {
    expect(isExpenseCategory('material')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isExpenseCategory('materials')).toBe(false)
    expect(isExpenseCategory('')).toBe(false)
    expect(isExpenseCategory(undefined)).toBe(false)
    expect(isExpenseCategory(7)).toBe(false)
  })
})

describe('summaries', () => {
  const blank = { remark: null, shopName: null }

  it('shows a material as name then shop', () => {
    expect(
      EXPENSE_CATEGORIES.material.summary({
        ...blank,
        details: { name: '18mm MDF board' },
        shopName: 'Ajith Hardware',
      }),
    ).toBe('18mm MDF board · Ajith Hardware')
  })

  it('shows a material without its shop when the shop is gone', () => {
    expect(
      EXPENSE_CATEGORIES.material.summary({ ...blank, details: { name: '18mm MDF board' } }),
    ).toBe('18mm MDF board')
  })

  it('shows a salary as employee then type', () => {
    expect(
      EXPENSE_CATEGORIES.salary.summary({
        ...blank,
        details: { employeeName: 'Sunil', employeeType: 'part_time' },
      }),
    ).toBe('Sunil · Part time')
  })

  it('shows only the type when no employee name was given', () => {
    expect(
      EXPENSE_CATEGORIES.salary.summary({ ...blank, details: { employeeType: 'permanent' } }),
    ).toBe('Permanent')
  })

  it('shows business capital as its type label', () => {
    expect(
      EXPENSE_CATEGORIES.business_capital.summary({ ...blank, details: { kind: 'workshop_cost' } }),
    ).toBe('Workshop cost')
  })

  it('falls back when business capital carries an unrecognised type', () => {
    expect(
      EXPENSE_CATEGORIES.business_capital.summary({ ...blank, details: { kind: 'nope' } }),
    ).toBe('Business capital')
  })

  it('shows transport as its remark', () => {
    expect(
      EXPENSE_CATEGORIES.transport.summary({ details: {}, remark: 'Lorry to Kurunegala', shopName: null }),
    ).toBe('Lorry to Kurunegala')
  })

  it('falls back when transport has no remark', () => {
    expect(EXPENSE_CATEGORIES.transport.summary({ details: {}, remark: '  ', shopName: null })).toBe('Transport')
  })
})
