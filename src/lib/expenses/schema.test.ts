import { describe, it, expect } from 'vitest'
import { parseExpenseForm } from './schema'

function material(overrides: Record<string, unknown> = {}) {
  return {
    name: '18mm MDF board',
    description: '8 sheets',
    price: '50,000.00',
    discount: '2,500.00',
    shopId: 'shop-1',
    spentAt: '2026-09-24',
    remark: 'For RC194',
    ...overrides,
  }
}

function expectOk(result: ReturnType<typeof parseExpenseForm>) {
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`)
  return result.value
}

function expectError(result: ReturnType<typeof parseExpenseForm>) {
  if (result.ok) throw new Error('expected a validation failure')
  return result.error
}

describe('material', () => {
  it('nets the discount off the price', () => {
    const value = expectOk(parseExpenseForm('material', material()))
    expect(value.amountCents).toBe(4_750_000)
  })

  it('keeps the gross price and the discount in details', () => {
    const value = expectOk(parseExpenseForm('material', material()))
    expect(value.details).toEqual({
      name: '18mm MDF board',
      description: '8 sheets',
      priceCents: 5_000_000,
      discountCents: 250_000,
      shopId: 'shop-1',
    })
  })

  it('carries the shared fields through', () => {
    const value = expectOk(parseExpenseForm('material', material()))
    expect(value.category).toBe('material')
    expect(value.spentAt).toBe('2026-09-24')
    expect(value.remark).toBe('For RC194')
  })

  it('treats a blank discount as zero', () => {
    const value = expectOk(parseExpenseForm('material', material({ discount: '' })))
    expect(value.amountCents).toBe(5_000_000)
    expect(value.details.discountCents).toBe(0)
  })

  it('treats an entirely absent discount as zero', () => {
    const { discount: _discount, ...withoutDiscount } = material()
    const value = expectOk(parseExpenseForm('material', withoutDiscount))
    expect(value.amountCents).toBe(5_000_000)
  })

  it('nulls a blank description and remark', () => {
    const value = expectOk(parseExpenseForm('material', material({ description: '', remark: '   ' })))
    expect(value.details.description).toBeNull()
    expect(value.remark).toBeNull()
  })

  it('rejects a discount larger than the price', () => {
    const error = expectError(parseExpenseForm('material', material({ price: '1,000.00', discount: '1,000.01' })))
    expect(error).toBe('Discount cannot be more than the price.')
  })

  it('accepts a discount exactly equal to the price', () => {
    const value = expectOk(parseExpenseForm('material', material({ price: '1,000.00', discount: '1,000.00' })))
    expect(value.amountCents).toBe(0)
  })

  it('rejects a missing name', () => {
    expect(expectError(parseExpenseForm('material', material({ name: '  ' })))).toBe('Give the material a name')
  })

  it('rejects a missing shop', () => {
    expect(expectError(parseExpenseForm('material', material({ shopId: '' })))).toBe('Choose a shop')
  })

  it('rejects an unparseable price', () => {
    expect(expectError(parseExpenseForm('material', material({ price: 'a lot' })))).toContain('price')
  })

  it('rejects a missing date', () => {
    expect(expectError(parseExpenseForm('material', material({ spentAt: '' })))).toBe('Pick a date')
  })
})

describe('salary', () => {
  function salary(overrides: Record<string, unknown> = {}) {
    return { employeeType: 'part_time', employeeName: 'Sunil', salary: '12,000.00', spentAt: '2026-09-23', remark: '', ...overrides }
  }

  it('uses the salary as the amount', () => {
    const value = expectOk(parseExpenseForm('salary', salary()))
    expect(value.amountCents).toBe(1_200_000)
    expect(value.details).toEqual({ employeeType: 'part_time', employeeName: 'Sunil' })
  })

  it('defaults an absent employee type to part time', () => {
    const { employeeType: _type, ...withoutType } = salary()
    expect(expectOk(parseExpenseForm('salary', withoutType)).details.employeeType).toBe('part_time')
  })

  it('accepts permanent', () => {
    expect(expectOk(parseExpenseForm('salary', salary({ employeeType: 'permanent' }))).details.employeeType).toBe('permanent')
  })

  it('rejects an employee type that is neither', () => {
    expect(expectError(parseExpenseForm('salary', salary({ employeeType: 'contractor' })))).toBeTruthy()
  })

  it('nulls a blank employee name', () => {
    expect(expectOk(parseExpenseForm('salary', salary({ employeeName: '' }))).details.employeeName).toBeNull()
  })

  it('rejects a missing salary', () => {
    expect(expectError(parseExpenseForm('salary', salary({ salary: '' })))).toContain('salary')
  })
})

describe('business capital', () => {
  function capital(overrides: Record<string, unknown> = {}) {
    return { kind: 'tools', amount: '18,400.00', spentAt: '2026-09-20', remark: 'Router', ...overrides }
  }

  it('uses the amount', () => {
    const value = expectOk(parseExpenseForm('business_capital', capital()))
    expect(value.amountCents).toBe(1_840_000)
    expect(value.details).toEqual({ kind: 'tools' })
  })

  it('accepts every listed kind', () => {
    for (const kind of ['workshop_cost', 'vehicle_cost', 'tools', 'repair', 'other']) {
      expect(expectOk(parseExpenseForm('business_capital', capital({ kind }))).details.kind).toBe(kind)
    }
  })

  it('rejects an unlisted kind', () => {
    expect(expectError(parseExpenseForm('business_capital', capital({ kind: 'bribes' })))).toBe('Choose a type')
  })
})

describe('transport', () => {
  it('uses the price and stores no details', () => {
    const value = expectOk(
      parseExpenseForm('transport', { amount: '3,500.00', spentAt: '2026-09-19', remark: 'Lorry hire' }),
    )
    expect(value.amountCents).toBe(350_000)
    expect(value.details).toEqual({})
    expect(value.remark).toBe('Lorry hire')
  })

  it('rejects a missing price', () => {
    expect(expectError(parseExpenseForm('transport', { amount: '', spentAt: '2026-09-19', remark: '' }))).toContain('price')
  })
})

describe('the category itself', () => {
  it('fails closed on an unknown category', () => {
    expect(expectError(parseExpenseForm('crypto', {}))).toBe('Unknown expense category.')
  })

  it('fails closed on a missing category', () => {
    expect(expectError(parseExpenseForm(undefined, {}))).toBe('Unknown expense category.')
  })
})
