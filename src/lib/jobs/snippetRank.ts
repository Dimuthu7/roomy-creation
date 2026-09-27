export interface Snippet {
  id: string
  label: string | null
  value: string
  useCount: number
}

const DEFAULT_LIMIT = 8

/** Ranks previously used specification lines for the autocomplete. Ordering is by
 *  match quality first, then by how often the line has been used — a line typed on
 *  eight past quotations is far more likely to be the one wanted than a one-off.
 *  Filtering in JS rather than SQL because the snippet table is small (hundreds of
 *  rows at most) and this keeps the ranking rule testable without a database. */
export function rankSnippets(snippets: Snippet[], query: string, limit = DEFAULT_LIMIT): Snippet[] {
  const q = query.trim().toLowerCase()

  const scored = snippets
    .map((snippet) => {
      if (q === '') return { snippet, rank: 0 }
      const label = (snippet.label ?? '').toLowerCase()
      if (label.includes(q)) return { snippet, rank: 0 }
      if (snippet.value.toLowerCase().includes(q)) return { snippet, rank: 1 }
      return null
    })
    .filter((entry) => entry !== null)

  scored.sort((a, b) => a.rank - b.rank || b.snippet.useCount - a.snippet.useCount)
  return scored.slice(0, limit).map((entry) => entry.snippet)
}
