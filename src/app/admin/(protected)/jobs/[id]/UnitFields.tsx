'use client'
import { useEffect, useReducer, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import { emptyUnit, unitEditorReducer } from '@/lib/jobs/unitEditor'
import type { DraftSpec, EditorAction, DraftUnit } from '@/lib/jobs/unitEditor'
import type { Snippet } from '@/lib/jobs/snippetRank'

const FIELD = 'w-full border border-navy bg-transparent p-2 text-sm text-navy'
const SMALL_BTN =
  'rounded-full border border-navy px-3 py-1 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-30'
const SUGGESTION_DEBOUNCE_MS = 200

function SpecSuggestions({ suggestions, onSelect }: { suggestions: Snippet[]; onSelect: (snippet: Snippet) => void }) {
  if (suggestions.length === 0) return null
  return (
    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto border border-navy bg-paper text-sm shadow-lg">
      {suggestions.map((snippet) => (
        <li key={snippet.id}>
          <button
            type="button"
            data-testid="spec-suggestion"
            // onMouseDown fires before the input's onBlur, so the click registers
            // before the dropdown would otherwise close and swallow it.
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(snippet)
            }}
            className="block w-full px-2 py-1 text-left hover:bg-navy hover:text-paper"
          >
            {snippet.label ? <span className="font-semibold">{snippet.label}: </span> : null}
            {snippet.value}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** One specification line's label/value inputs plus their autocomplete. Suggestion
 *  state (which field is open, what came back) is local to the row — every row can
 *  have its own dropdown open independently. Picking a suggestion fills both the
 *  label and value in one action, since the pair is what repeats across quotations. */
function SpecLineRow({
  spec,
  unitKey,
  optionKey,
  specIndex,
  isFirst,
  isLast,
  dispatch,
}: {
  spec: DraftSpec
  unitKey: string
  optionKey: string
  specIndex: number
  isFirst: boolean
  isLast: boolean
  dispatch: Dispatch<EditorAction>
}) {
  const [activeField, setActiveField] = useState<'label' | 'value' | null>(null)
  const [suggestions, setSuggestions] = useState<Snippet[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function requestSuggestions(field: 'label' | 'value', text: string) {
    setActiveField(field)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/admin/spec-snippets?${new URLSearchParams({ q: text })}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { snippets: Snippet[] } | null) => {
          if (data) setSuggestions(data.snippets)
        })
        .catch(() => {})
    }, SUGGESTION_DEBOUNCE_MS)
  }

  function selectSuggestion(snippet: Snippet) {
    dispatch({ type: 'setSpec', unitKey, optionKey, specIndex, field: 'label', text: snippet.label ?? '' })
    dispatch({ type: 'setSpec', unitKey, optionKey, specIndex, field: 'value', text: snippet.value })
    setActiveField(null)
    setSuggestions([])
  }

  function closeField(field: 'label' | 'value') {
    // Delayed so a suggestion's onMouseDown still lands while this field still
    // counts as focused; onMouseDown's preventDefault means no real blur race here,
    // but the delay is cheap insurance against a future change removing that.
    setTimeout(() => setActiveField((current) => (current === field ? null : current)), 150)
  }

  return (
    <div data-testid="spec-row" className="flex flex-wrap items-center gap-2">
      <div className="relative w-40">
        <input
          data-testid="spec-label"
          value={spec.label}
          onChange={(e) => {
            dispatch({ type: 'setSpec', unitKey, optionKey, specIndex, field: 'label', text: e.target.value })
            requestSuggestions('label', e.target.value)
          }}
          onFocus={() => requestSuggestions('label', spec.label)}
          onBlur={() => closeField('label')}
          placeholder="Label (optional), e.g. Carcase"
          className={FIELD}
          autoComplete="off"
        />
        {activeField === 'label' && <SpecSuggestions suggestions={suggestions} onSelect={selectSuggestion} />}
      </div>
      <div className="relative flex-1">
        <input
          data-testid="spec-value"
          value={spec.value}
          onChange={(e) => {
            dispatch({ type: 'setSpec', unitKey, optionKey, specIndex, field: 'value', text: e.target.value })
            requestSuggestions('value', e.target.value)
          }}
          onFocus={() => requestSuggestions('value', spec.value)}
          onBlur={() => closeField('value')}
          placeholder="Fabrication of cupboards carcase made out with 18mm..."
          className={FIELD}
          autoComplete="off"
        />
        {activeField === 'value' && <SpecSuggestions suggestions={suggestions} onSelect={selectSuggestion} />}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => dispatch({ type: 'moveSpec', unitKey, optionKey, specIndex, direction: 'up' })}
          className={SMALL_BTN}
          aria-label="Move spec line up"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => dispatch({ type: 'moveSpec', unitKey, optionKey, specIndex, direction: 'down' })}
          className={SMALL_BTN}
          aria-label="Move spec line down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'removeSpec', unitKey, optionKey, specIndex })}
          className={SMALL_BTN}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

/** Owns the unit/option/spec-line draft via unitEditorReducer and renders it, so the
 *  full add/remove/duplicate/reorder behaviour lives in one tested place
 *  (unitEditor.test.ts). Serialises the whole draft into a single hidden JSON field —
 *  jobUnitsSchema is what parses it back on save — and reports every change up via
 *  onChange so JobEditor can compute a live totals preview from the same draft. */
export function UnitFields({
  initialUnits,
  onChange,
}: {
  initialUnits: DraftUnit[]
  onChange: (units: DraftUnit[]) => void
}) {
  const [units, dispatch] = useReducer(unitEditorReducer, initialUnits.length > 0 ? initialUnits : [emptyUnit()])

  useEffect(() => {
    onChange(units)
    // onChange is a fresh function identity from JobEditor's setState on every render;
    // including it would refire this effect every render for no reason. It only needs
    // to run again when the draft itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units])

  return (
    <div className="space-y-6">
      <input type="hidden" name="units" value={JSON.stringify(units)} />

      {units.map((unit, unitIndex) => (
        <div key={unit.key} data-testid="unit-row" className="space-y-4 border-2 border-navy p-4">
          <div className="flex items-start justify-between gap-4">
            <input
              data-testid="unit-title"
              value={unit.title}
              onChange={(e) => dispatch({ type: 'setUnitTitle', unitKey: unit.key, title: e.target.value })}
              placeholder="Unit title, e.g. Wardrobe with Dressing Unit"
              className={`${FIELD} flex-1 font-display`}
            />
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={unitIndex === 0}
                onClick={() => dispatch({ type: 'moveUnit', unitKey: unit.key, direction: 'up' })}
                className={SMALL_BTN}
                aria-label="Move unit up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={unitIndex === units.length - 1}
                onClick={() => dispatch({ type: 'moveUnit', unitKey: unit.key, direction: 'down' })}
                className={SMALL_BTN}
                aria-label="Move unit down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'duplicateUnit', unitKey: unit.key })}
                className={SMALL_BTN}
              >
                Duplicate unit
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'removeUnit', unitKey: unit.key })}
                className={SMALL_BTN}
              >
                Remove unit
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {unit.options.map((option) => (
              <div key={option.key} data-testid="option-row" className="space-y-3 border border-navy/40 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {unit.options.length > 1 && (
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        data-testid="option-selected"
                        name={`selected-${unit.key}`}
                        checked={option.selected}
                        onChange={() =>
                          dispatch({ type: 'selectOption', unitKey: unit.key, optionKey: option.key })
                        }
                        className="size-4 accent-navy"
                      />
                      <span className="u-mono text-xs">Selected</span>
                    </label>
                  )}
                  <input
                    data-testid="option-label"
                    value={option.label}
                    onChange={(e) =>
                      dispatch({
                        type: 'setOptionField',
                        unitKey: unit.key,
                        optionKey: option.key,
                        field: 'label',
                        text: e.target.value,
                      })
                    }
                    placeholder={unit.options.length > 1 ? 'Option 01' : 'Option label (optional)'}
                    className={`${FIELD} w-40`}
                  />
                  <input
                    data-testid="option-price"
                    value={option.price}
                    onChange={(e) =>
                      dispatch({
                        type: 'setOptionField',
                        unitKey: unit.key,
                        optionKey: option.key,
                        field: 'price',
                        text: e.target.value,
                      })
                    }
                    inputMode="decimal"
                    placeholder="182,500.00"
                    className={`${FIELD} w-36`}
                  />
                  <input
                    data-testid="option-qty"
                    value={option.qty}
                    onChange={(e) =>
                      dispatch({
                        type: 'setOptionField',
                        unitKey: unit.key,
                        optionKey: option.key,
                        field: 'qty',
                        text: e.target.value,
                      })
                    }
                    inputMode="numeric"
                    placeholder="Qty"
                    className={`${FIELD} w-20`}
                  />
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: 'duplicateOption', unitKey: unit.key, optionKey: option.key })
                      }
                      className={SMALL_BTN}
                    >
                      Duplicate option
                    </button>
                    <button
                      type="button"
                      disabled={unit.options.length <= 1}
                      onClick={() => dispatch({ type: 'removeOption', unitKey: unit.key, optionKey: option.key })}
                      className={SMALL_BTN}
                    >
                      Remove option
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pl-4">
                  {option.specs.map((spec, specIndex) => (
                    <SpecLineRow
                      key={specIndex}
                      spec={spec}
                      unitKey={unit.key}
                      optionKey={option.key}
                      specIndex={specIndex}
                      isFirst={specIndex === 0}
                      isLast={specIndex === option.specs.length - 1}
                      dispatch={dispatch}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'addSpec', unitKey: unit.key, optionKey: option.key })}
                    className={SMALL_BTN}
                  >
                    + Add spec line
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              data-testid="add-option"
              onClick={() => dispatch({ type: 'addOption', unitKey: unit.key })}
              className={SMALL_BTN}
            >
              + Add option
            </button>
          </div>
        </div>
      ))}

      <button type="button" data-testid="add-unit" onClick={() => dispatch({ type: 'addUnit' })} className={SMALL_BTN}>
        + Add unit
      </button>
    </div>
  )
}
