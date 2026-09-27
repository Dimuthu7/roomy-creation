import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpenseBreakdown } from './ExpenseBreakdown'

const PER_CATEGORY = [
  { category: 'material' as const, label: 'Material', totalCents: 38_650_000 },
  { category: 'salary' as const, label: 'Salaries', totalCents: 14_500_000 },
  { category: 'business_capital' as const, label: 'Business Capital', totalCents: 0 },
  { category: 'transport' as const, label: 'Transport', totalCents: 1_840_000 },
]

describe('ExpenseBreakdown', () => {
  it('lists every category with its grouped total', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={54_990_000} entryCount={42} />)
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('386,500.00')).toBeInTheDocument()
    expect(screen.getByText('145,000.00')).toBeInTheDocument()
  })

  it('shows a zero rather than hiding a category with no spend', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={54_990_000} entryCount={42} />)
    expect(screen.getByText('Business Capital')).toBeInTheDocument()
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('shows the grand total and the entry count', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={54_990_000} entryCount={42} />)
    expect(screen.getByTestId('expense-total')).toHaveTextContent('549,900.00')
    expect(screen.getByText('42 entries')).toBeInTheDocument()
  })

  it('says "1 entry", not "1 entries"', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={100} entryCount={1} />)
    expect(screen.getByText('1 entry')).toBeInTheDocument()
  })
})
