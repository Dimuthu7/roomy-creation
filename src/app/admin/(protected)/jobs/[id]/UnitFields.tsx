'use client'
import { useEffect, useReducer } from 'react'
import { emptyUnit, unitEditorReducer } from '@/lib/jobs/unitEditor'
import type { DraftUnit } from '@/lib/jobs/unitEditor'

const FIELD = 'w-full border border-navy bg-transparent p-2 text-sm text-navy'
const SMALL_BTN =
  'rounded-full border border-navy px-3 py-1 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-30'

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
                    <div key={specIndex} data-testid="spec-row" className="flex flex-wrap items-center gap-2">
                      <input
                        data-testid="spec-label"
                        value={spec.label}
                        onChange={(e) =>
                          dispatch({
                            type: 'setSpec',
                            unitKey: unit.key,
                            optionKey: option.key,
                            specIndex,
                            field: 'label',
                            text: e.target.value,
                          })
                        }
                        placeholder="Label (optional), e.g. Carcase"
                        className={`${FIELD} w-40`}
                      />
                      <input
                        data-testid="spec-value"
                        value={spec.value}
                        onChange={(e) =>
                          dispatch({
                            type: 'setSpec',
                            unitKey: unit.key,
                            optionKey: option.key,
                            specIndex,
                            field: 'value',
                            text: e.target.value,
                          })
                        }
                        placeholder="Fabrication of cupboards carcase made out with 18mm..."
                        className={`${FIELD} flex-1`}
                      />
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={specIndex === 0}
                          onClick={() =>
                            dispatch({
                              type: 'moveSpec',
                              unitKey: unit.key,
                              optionKey: option.key,
                              specIndex,
                              direction: 'up',
                            })
                          }
                          className={SMALL_BTN}
                          aria-label="Move spec line up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={specIndex === option.specs.length - 1}
                          onClick={() =>
                            dispatch({
                              type: 'moveSpec',
                              unitKey: unit.key,
                              optionKey: option.key,
                              specIndex,
                              direction: 'down',
                            })
                          }
                          className={SMALL_BTN}
                          aria-label="Move spec line down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: 'removeSpec', unitKey: unit.key, optionKey: option.key, specIndex })
                          }
                          className={SMALL_BTN}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
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
