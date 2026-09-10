import { describe, it, expect } from 'vitest'
import { emptyUnit, unitEditorReducer } from './unitEditor'
import type { DraftUnit } from './unitEditor'

function seed(): DraftUnit[] {
  return [{ ...emptyUnit(), key: 'u1', title: 'Study Cupboards' }]
}

describe('unitEditorReducer', () => {
  it('starts a new unit with exactly one option, per the always-one-option invariant', () => {
    expect(emptyUnit().options).toHaveLength(1)
  })

  it('adds a unit', () => {
    const next = unitEditorReducer(seed(), { type: 'addUnit' })
    expect(next).toHaveLength(2)
    expect(next[1].options).toHaveLength(1)
  })

  it('removes a unit', () => {
    expect(unitEditorReducer(seed(), { type: 'removeUnit', unitKey: 'u1' })).toHaveLength(0)
  })

  it('edits a unit title', () => {
    const next = unitEditorReducer(seed(), { type: 'setUnitTitle', unitKey: 'u1', title: 'Wardrobe' })
    expect(next[0].title).toBe('Wardrobe')
  })

  it('moves a unit up', () => {
    const two = unitEditorReducer(seed(), { type: 'addUnit' })
    const moved = unitEditorReducer(two, { type: 'moveUnit', unitKey: two[1].key, direction: 'up' })
    expect(moved[0].key).toBe(two[1].key)
  })

  it('leaves the order alone when moving the first unit up', () => {
    const state = seed()
    expect(unitEditorReducer(state, { type: 'moveUnit', unitKey: 'u1', direction: 'up' })[0].key).toBe('u1')
  })

  it('adds an option to a unit', () => {
    const next = unitEditorReducer(seed(), { type: 'addOption', unitKey: 'u1' })
    expect(next[0].options).toHaveLength(2)
  })

  it('refuses to remove the last option, keeping the invariant', () => {
    const next = unitEditorReducer(seed(), { type: 'removeOption', unitKey: 'u1', optionKey: seed()[0].options[0].key })
    expect(next[0].options).toHaveLength(1)
  })

  it('duplicates an option with all its specification lines', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'setSpec', unitKey: 'u1', optionKey, specIndex: 0, field: 'value', text: 'Jungle Teak doors' })
    state = unitEditorReducer(state, { type: 'duplicateOption', unitKey: 'u1', optionKey })
    expect(state[0].options).toHaveLength(2)
    expect(state[0].options[1].specs[0].value).toBe('Jungle Teak doors')
  })

  it('gives a duplicated option a distinct key so React can tell them apart', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'duplicateOption', unitKey: 'u1', optionKey })
    expect(state[0].options[0].key).not.toBe(state[0].options[1].key)
  })

  it('duplicates a whole unit', () => {
    let state = seed()
    state = unitEditorReducer(state, { type: 'duplicateUnit', unitKey: 'u1' })
    expect(state).toHaveLength(2)
    expect(state[1].title).toBe('Study Cupboards')
    expect(state[1].key).not.toBe('u1')
  })

  it('selecting an option clears the selection on its siblings', () => {
    let state = unitEditorReducer(seed(), { type: 'addOption', unitKey: 'u1' })
    state = unitEditorReducer(state, { type: 'selectOption', unitKey: 'u1', optionKey: state[0].options[0].key })
    state = unitEditorReducer(state, { type: 'selectOption', unitKey: 'u1', optionKey: state[0].options[1].key })
    expect(state[0].options.filter((o) => o.selected)).toHaveLength(1)
    expect(state[0].options[1].selected).toBe(true)
  })

  it('adds and removes specification lines', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'addSpec', unitKey: 'u1', optionKey })
    expect(state[0].options[0].specs).toHaveLength(2)
    state = unitEditorReducer(state, { type: 'removeSpec', unitKey: 'u1', optionKey, specIndex: 0 })
    expect(state[0].options[0].specs).toHaveLength(1)
  })

  it('moves a specification line down', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'setSpec', unitKey: 'u1', optionKey, specIndex: 0, field: 'value', text: 'first' })
    state = unitEditorReducer(state, { type: 'addSpec', unitKey: 'u1', optionKey })
    state = unitEditorReducer(state, { type: 'setSpec', unitKey: 'u1', optionKey, specIndex: 1, field: 'value', text: 'second' })
    state = unitEditorReducer(state, { type: 'moveSpec', unitKey: 'u1', optionKey, specIndex: 0, direction: 'down' })
    expect(state[0].options[0].specs[0].value).toBe('second')
  })

  it('never mutates the state it is given', () => {
    const state = seed()
    const frozen = JSON.stringify(state)
    unitEditorReducer(state, { type: 'setUnitTitle', unitKey: 'u1', title: 'Changed' })
    expect(JSON.stringify(state)).toBe(frozen)
  })
})
