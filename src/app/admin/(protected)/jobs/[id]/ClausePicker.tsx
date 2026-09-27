'use client'
import { useState } from 'react'

export interface ClauseDraft {
  body: string
  emphasis: boolean
}

export interface LibraryClauseOption {
  id: string
  body: string
  emphasis: boolean
}

const FIELD = 'w-full border border-navy bg-transparent p-2 text-sm text-navy'
const SMALL_BTN =
  'rounded-full border border-navy px-3 py-1 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95'

/** A job's clauses are copied text (see the spec's "Clause libraries" section), never
 *  a reference — editing one here never touches the library, and library edits never
 *  touch a past job. "Not already on the job" is judged by exact body match, since
 *  there is no id linking a job clause back to the library row it came from. */
export function ClausePicker({
  fieldName,
  title,
  initialClauses,
  library,
}: {
  fieldName: string
  title: string
  initialClauses: ClauseDraft[]
  library: LibraryClauseOption[]
}) {
  const [clauses, setClauses] = useState<ClauseDraft[]>(initialClauses)

  const usedBodies = new Set(clauses.map((c) => c.body))
  const available = library.filter((l) => !usedBodies.has(l.body))

  function update(index: number, patch: Partial<ClauseDraft>) {
    setClauses((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function remove(index: number) {
    setClauses((prev) => prev.filter((_, i) => i !== index))
  }

  function addFromLibrary(option: LibraryClauseOption) {
    setClauses((prev) => [...prev, { body: option.body, emphasis: option.emphasis }])
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-navy">{title}</h3>
      <input type="hidden" name={fieldName} value={JSON.stringify(clauses)} />

      <div className="space-y-2">
        {clauses.map((clause, index) => (
          <div key={index} data-testid="clause-draft-row" className="space-y-2 border border-navy/40 p-3">
            <textarea
              data-testid="clause-draft-body"
              value={clause.body}
              onChange={(e) => update(index, { body: e.target.value })}
              rows={2}
              className={FIELD}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clause.emphasis}
                  onChange={(e) => update(index, { emphasis: e.target.checked })}
                  className="size-4 accent-navy"
                />
                <span className="u-mono text-xs">Bold on the document</span>
              </label>
              <button type="button" data-testid="clause-draft-remove" onClick={() => remove(index)} className={SMALL_BTN}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {clauses.length === 0 && <p className="u-mono text-sm text-navy/70">No {title.toLowerCase()} added yet.</p>}
      </div>

      {available.length > 0 && (
        <div className="space-y-2">
          <p className="u-mono text-xs text-navy/70">Add from library</p>
          <div className="flex flex-wrap gap-2">
            {available.map((option) => (
              <button
                key={option.id}
                type="button"
                data-testid="clause-add-from-library"
                onClick={() => addFromLibrary(option)}
                className={SMALL_BTN}
                title={option.body}
              >
                + {option.body.length > 40 ? `${option.body.slice(0, 40)}…` : option.body}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
