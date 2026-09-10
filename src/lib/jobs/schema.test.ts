import { describe, it, expect } from 'vitest'
import { clauseFormSchema, customerFormSchema, jobDetailsFormSchema, jobUnitsSchema } from './schema'

const CUSTOMER = { name: 'Williams', phone: '+94 772383430', email: '', addressLines: 'Galapitamulla\nKurunegala.', city: '', district: '', notes: '' }

describe('customerFormSchema', () => {
  it('accepts a customer with only a name and phone', () => {
    expect(customerFormSchema.safeParse(CUSTOMER).success).toBe(true)
  })

  it('requires a name', () => {
    expect(customerFormSchema.safeParse({ ...CUSTOMER, name: '  ' }).success).toBe(false)
  })

  it('requires a phone number with enough digits to call back on', () => {
    expect(customerFormSchema.safeParse({ ...CUSTOMER, phone: '123' }).success).toBe(false)
  })

  it('splits address lines on newlines and drops blank ones', () => {
    const result = customerFormSchema.parse(CUSTOMER)
    expect(result.addressLines).toEqual(['Galapitamulla', 'Kurunegala.'])
  })

  it('turns a blank email into null rather than an empty string', () => {
    expect(customerFormSchema.parse(CUSTOMER).email).toBeNull()
  })

  it('rejects an email with no domain', () => {
    expect(customerFormSchema.safeParse({ ...CUSTOMER, email: 'nobody@' }).success).toBe(false)
  })
})

const DETAILS = {
  salesPerson: 'ISHAN',
  quotationDate: '2026-03-21',
  estimationDate: '',
  freeDelivery: 'on',
  deliveryCharge: '',
  discountLabel: 'Cash Discount',
  discount: '30,000.00',
  advance: '',
  status: 'pending',
  notes: '',
}

describe('jobDetailsFormSchema', () => {
  it('accepts the RC188 details', () => {
    expect(jobDetailsFormSchema.safeParse(DETAILS).success).toBe(true)
  })

  it('converts the discount to cents', () => {
    expect(jobDetailsFormSchema.parse(DETAILS).discountCents).toBe(3_000_000)
  })

  it('treats a blank discount as zero', () => {
    expect(jobDetailsFormSchema.parse({ ...DETAILS, discount: '' }).discountCents).toBe(0)
  })

  it('reads an unchecked free-delivery checkbox as false', () => {
    expect(jobDetailsFormSchema.parse({ ...DETAILS, freeDelivery: undefined }).freeDelivery).toBe(false)
  })

  it('reads a free-delivery checkbox FormData omits entirely (not just undefined) as false', () => {
    // A real unchecked <input type="checkbox"> is never submitted at all — the key is
    // absent from FormData, not present with value undefined. Object.fromEntries on a
    // real FormData produces exactly this shape, which is what this test builds via
    // destructuring rather than `freeDelivery: undefined`.
    const withoutFreeDelivery = Object.fromEntries(
      Object.entries(DETAILS).filter(([key]) => key !== 'freeDelivery'),
    )
    expect(jobDetailsFormSchema.safeParse(withoutFreeDelivery).success).toBe(true)
    expect(jobDetailsFormSchema.parse(withoutFreeDelivery).freeDelivery).toBe(false)
  })

  it('nulls the delivery charge when free delivery is ticked, whatever the field holds', () => {
    const parsed = jobDetailsFormSchema.parse({ ...DETAILS, freeDelivery: 'on', deliveryCharge: '5000' })
    expect(parsed.deliveryChargeCents).toBeNull()
  })

  it('keeps the delivery charge when free delivery is unticked', () => {
    const parsed = jobDetailsFormSchema.parse({ ...DETAILS, freeDelivery: undefined, deliveryCharge: '5,000.00' })
    expect(parsed.deliveryChargeCents).toBe(500_000)
  })

  it('rejects a non-numeric discount', () => {
    expect(jobDetailsFormSchema.safeParse({ ...DETAILS, discount: 'lots' }).success).toBe(false)
  })

  it('requires a quotation date', () => {
    expect(jobDetailsFormSchema.safeParse({ ...DETAILS, quotationDate: '' }).success).toBe(false)
  })

  it('turns a blank estimation date into null', () => {
    expect(jobDetailsFormSchema.parse(DETAILS).estimationDate).toBeNull()
  })

  it('rejects an unknown status', () => {
    expect(jobDetailsFormSchema.safeParse({ ...DETAILS, status: 'shipped' }).success).toBe(false)
  })
})

describe('clauseFormSchema', () => {
  it('accepts a terms clause', () => {
    expect(clauseFormSchema.safeParse({ kind: 'terms', body: 'Manufacturing time - 15 to 30 days.', emphasis: undefined }).success).toBe(true)
  })

  it('rejects an unknown kind', () => {
    expect(clauseFormSchema.safeParse({ kind: 'shipping', body: 'x', emphasis: undefined }).success).toBe(false)
  })

  it('requires a non-empty body', () => {
    expect(clauseFormSchema.safeParse({ kind: 'terms', body: '   ', emphasis: undefined }).success).toBe(false)
  })

  it('reads the emphasis checkbox', () => {
    expect(clauseFormSchema.parse({ kind: 'terms', body: 'x', emphasis: 'on' }).emphasis).toBe(true)
  })

  it('accepts a real unchecked-checkbox payload where the emphasis key is absent entirely', () => {
    // Object.fromEntries(new FormData()) never includes a key for an unticked
    // checkbox — this is the exact shape addClause() receives in production, distinct
    // from `{ emphasis: undefined }` above. A prior version of the checkbox() helper
    // passed every test in this file yet failed on every real form submission because
    // it only tolerated an explicit undefined, not a missing key.
    const fd = new FormData()
    fd.set('kind', 'warranty')
    fd.set('body', 'E2E test warranty clause')
    const result = clauseFormSchema.safeParse(Object.fromEntries(fd))
    expect(result.success).toBe(true)
    expect(result.success && result.data.emphasis).toBe(false)
  })
})

const UNITS_JSON = JSON.stringify([
  {
    title: 'Study Cupboards',
    options: [
      { label: 'Option 01', price: '182,500.00', qty: '1', selected: false, specs: [{ label: 'Size', value: 'L- 2780mm X H-2370mm X D-400mm' }] },
      { label: 'Option 02', price: '257,000.00', qty: '1', selected: false, specs: [{ label: null, value: 'Gloss finish doors' }] },
    ],
  },
])

describe('jobUnitsSchema', () => {
  it('accepts a unit with two priced options', () => {
    expect(jobUnitsSchema.safeParse(JSON.parse(UNITS_JSON)).success).toBe(true)
  })

  it('converts option prices to cents', () => {
    const parsed = jobUnitsSchema.parse(JSON.parse(UNITS_JSON))
    expect(parsed[0].options[0].priceCents).toBe(18_250_000)
  })

  it('requires a unit title', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].title = ''
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('requires every unit to have at least one option', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options = []
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('rejects a quantity below one', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options[0].qty = '0'
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('rejects two options selected on the same unit', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options[0].selected = true
    units[0].options[1].selected = true
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('drops a specification line with an empty value', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options[0].specs.push({ label: 'Blank', value: '   ' })
    expect(jobUnitsSchema.parse(units)[0].options[0].specs).toHaveLength(1)
  })
})
