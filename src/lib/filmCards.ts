export function cardIndexAt(time: number, starts: number[]): number {
  if (starts.length === 0) return 0
  if (!Number.isFinite(time) || time < 0) return 0
  let index = 0
  for (let i = 0; i < starts.length; i++) {
    if (time >= starts[i]) index = i
  }
  return index
}
