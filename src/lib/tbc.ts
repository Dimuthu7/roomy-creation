export const TBC = '[TBC]' as const
export type TBCValue = typeof TBC
export type Maybe<T> = T | TBCValue

export function isTBC(value: unknown): value is TBCValue {
  return value === TBC
}

export function resolve<T>(value: Maybe<T>, fallback: T): T {
  return isTBC(value) ? fallback : (value as T)
}

export function omitTBC<T extends object>(source: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [key, value] of Object.entries(source)) {
    if (!isTBC(value)) out[key as keyof T] = value as T[keyof T]
  }
  return out
}

export function joinDefined(parts: Maybe<string>[], separator: string): string {
  return parts.filter((p): p is string => !isTBC(p) && p !== '').join(separator)
}
