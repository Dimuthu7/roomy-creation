export function nextIndex(current: number, length: number): number {
  if (length <= 0) return 0
  return (current + 1) % length
}

export function prevIndex(current: number, length: number): number {
  if (length <= 0) return 0
  return (current - 1 + length) % length
}
