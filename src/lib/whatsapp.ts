import { isTBC, type Maybe } from './tbc'

export function whatsappUrl(number: Maybe<string>, message: string): string | null {
  if (isTBC(number)) return null
  const digits = number.replace(/\D/g, '')
  if (digits.length === 0) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
