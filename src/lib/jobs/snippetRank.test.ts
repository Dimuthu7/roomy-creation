import { describe, it, expect } from 'vitest'
import { rankSnippets } from './snippetRank'

const SNIPPETS = [
  { id: '1', label: 'Carcase', value: 'Fabrication of cupboards carcase made out with 18mm Melamine faced Heavier boards', useCount: 3 },
  { id: '2', label: 'Doors', value: 'Fabrication of cupboards Doors made out with 18mm Melamine faced Heavier boards', useCount: 8 },
  { id: '3', label: 'Door Mechanism', value: 'High Quality Branded Soft Closing Hinges', useCount: 5 },
  { id: '4', label: null, value: '01 Soft closing drawer with 01 cupboard', useCount: 1 },
]

describe('rankSnippets', () => {
  it('returns the most used first for an empty query', () => {
    expect(rankSnippets(SNIPPETS, '').map((s) => s.id)).toEqual(['2', '3', '1', '4'])
  })

  it('matches on the label', () => {
    expect(rankSnippets(SNIPPETS, 'carcase').map((s) => s.id)).toEqual(['1'])
  })

  it('matches on the value', () => {
    expect(rankSnippets(SNIPPETS, 'soft closing').map((s) => s.id)).toEqual(['3', '4'])
  })

  it('is case insensitive', () => {
    expect(rankSnippets(SNIPPETS, 'HINGES').map((s) => s.id)).toEqual(['3'])
  })

  it('ranks a label match above a value match', () => {
    expect(rankSnippets(SNIPPETS, 'door')[0].id).toBe('2')
  })

  it('tolerates a snippet with no label', () => {
    expect(rankSnippets(SNIPPETS, 'drawer').map((s) => s.id)).toEqual(['4'])
  })

  it('returns nothing for a query that matches nothing', () => {
    expect(rankSnippets(SNIPPETS, 'granite worktop')).toEqual([])
  })

  it('caps the result count', () => {
    expect(rankSnippets(SNIPPETS, '', 2)).toHaveLength(2)
  })
})
