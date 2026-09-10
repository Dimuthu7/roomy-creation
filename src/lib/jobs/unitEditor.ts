export interface DraftSpec {
  label: string
  value: string
}

export interface DraftOption {
  key: string
  label: string
  price: string
  qty: string
  selected: boolean
  specs: DraftSpec[]
}

export interface DraftUnit {
  key: string
  title: string
  options: DraftOption[]
}

export type EditorAction =
  | { type: 'addUnit' }
  | { type: 'removeUnit'; unitKey: string }
  | { type: 'duplicateUnit'; unitKey: string }
  | { type: 'setUnitTitle'; unitKey: string; title: string }
  | { type: 'moveUnit'; unitKey: string; direction: 'up' | 'down' }
  | { type: 'addOption'; unitKey: string }
  | { type: 'removeOption'; unitKey: string; optionKey: string }
  | { type: 'duplicateOption'; unitKey: string; optionKey: string }
  | { type: 'selectOption'; unitKey: string; optionKey: string }
  | { type: 'setOptionField'; unitKey: string; optionKey: string; field: 'label' | 'price' | 'qty'; text: string }
  | { type: 'addSpec'; unitKey: string; optionKey: string }
  | { type: 'removeSpec'; unitKey: string; optionKey: string; specIndex: number }
  | { type: 'setSpec'; unitKey: string; optionKey: string; specIndex: number; field: 'label' | 'value'; text: string }
  | { type: 'moveSpec'; unitKey: string; optionKey: string; specIndex: number; direction: 'up' | 'down' }

function key(): string {
  return crypto.randomUUID()
}

export function emptyOption(): DraftOption {
  return { key: key(), label: '', price: '', qty: '1', selected: false, specs: [{ label: '', value: '' }] }
}

/** A new unit always starts with one option — the "every unit has at least one option"
 *  invariant from the spec, established at creation rather than patched at save. */
export function emptyUnit(): DraftUnit {
  return { key: key(), title: '', options: [emptyOption()] }
}

function move<T>(items: T[], index: number, direction: 'up' | 'down'): T[] {
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function mapUnit(state: DraftUnit[], unitKey: string, fn: (unit: DraftUnit) => DraftUnit): DraftUnit[] {
  return state.map((unit) => (unit.key === unitKey ? fn(unit) : unit))
}

function mapOption(unit: DraftUnit, optionKey: string, fn: (option: DraftOption) => DraftOption): DraftUnit {
  return { ...unit, options: unit.options.map((o) => (o.key === optionKey ? fn(o) : o)) }
}

export function unitEditorReducer(state: DraftUnit[], action: EditorAction): DraftUnit[] {
  switch (action.type) {
    case 'addUnit':
      return [...state, emptyUnit()]

    case 'removeUnit':
      return state.filter((u) => u.key !== action.unitKey)

    case 'duplicateUnit': {
      const index = state.findIndex((u) => u.key === action.unitKey)
      if (index === -1) return state
      const source = state[index]
      const copy: DraftUnit = {
        ...source,
        key: key(),
        options: source.options.map((o) => ({ ...o, key: key(), specs: o.specs.map((s) => ({ ...s })) })),
      }
      return [...state.slice(0, index + 1), copy, ...state.slice(index + 1)]
    }

    case 'setUnitTitle':
      return mapUnit(state, action.unitKey, (u) => ({ ...u, title: action.title }))

    case 'moveUnit':
      return move(state, state.findIndex((u) => u.key === action.unitKey), action.direction)

    case 'addOption':
      return mapUnit(state, action.unitKey, (u) => ({ ...u, options: [...u.options, emptyOption()] }))

    case 'removeOption':
      // Refused rather than allowed, so the invariant cannot be broken from the UI.
      return mapUnit(state, action.unitKey, (u) =>
        u.options.length <= 1 ? u : { ...u, options: u.options.filter((o) => o.key !== action.optionKey) },
      )

    case 'duplicateOption':
      // The RC194 case: Option 02 differs from Option 01 in four lines out of six, so
      // copying and editing beats retyping. This is why spec lines live on the option.
      return mapUnit(state, action.unitKey, (u) => {
        const index = u.options.findIndex((o) => o.key === action.optionKey)
        if (index === -1) return u
        const source = u.options[index]
        const copy: DraftOption = {
          ...source,
          key: key(),
          selected: false,
          specs: source.specs.map((s) => ({ ...s })),
        }
        return { ...u, options: [...u.options.slice(0, index + 1), copy, ...u.options.slice(index + 1)] }
      })

    case 'selectOption':
      // Mirrors the database's partial unique index: selecting one clears the rest.
      return mapUnit(state, action.unitKey, (u) => ({
        ...u,
        options: u.options.map((o) => ({ ...o, selected: o.key === action.optionKey })),
      }))

    case 'setOptionField':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, [action.field]: action.text })),
      )

    case 'addSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, specs: [...o.specs, { label: '', value: '' }] })),
      )

    case 'removeSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, specs: o.specs.filter((_, i) => i !== action.specIndex) })),
      )

    case 'setSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({
          ...o,
          specs: o.specs.map((s, i) => (i === action.specIndex ? { ...s, [action.field]: action.text } : s)),
        })),
      )

    case 'moveSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, specs: move(o.specs, action.specIndex, action.direction) })),
      )
  }
}
