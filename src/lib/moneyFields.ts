import { z } from 'zod'
import { parseMoneyToCents } from '@/lib/money'

/** A money field that must be present. Shared by the quotation forms and the
 *  expenses form — one definition, so "45,000.00" is accepted identically in both. */
export function requiredMoney(message: string) {
  return z.string().transform((v, ctx) => {
    const cents = parseMoneyToCents(v)
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return cents
  })
}

/** A money field where blank means zero — discounts and delivery charges usually are. */
export function optionalMoney(message: string) {
  return z
    .string()
    .default('')
    .transform((v, ctx) => {
      if (v.trim() === '') return 0
      const cents = parseMoneyToCents(v)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return cents
    })
}
