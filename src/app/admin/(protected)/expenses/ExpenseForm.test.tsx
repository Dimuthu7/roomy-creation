import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('./actions', () => ({ addExpense: vi.fn(), NEW_SHOP_VALUE: '__new__' }))

import { ExpenseForm } from './ExpenseForm'

const SHOPS = [
  { id: 'shop-1', name: 'Ajith Hardware' },
  { id: 'shop-2', name: 'Nawaloka Timber' },
]

function setup() {
  return render(<ExpenseForm shops={SHOPS} today="2026-09-24" />)
}

describe('ExpenseForm', () => {
  it('starts on Material and shows its fields', () => {
    setup()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Price')).toBeInTheDocument()
    expect(screen.getByLabelText('Discount')).toBeInTheDocument()
    expect(screen.getByLabelText('Shop')).toBeInTheDocument()
  })

  it('defaults the date to today', () => {
    setup()
    expect(screen.getByLabelText('Date')).toHaveValue('2026-09-24')
  })

  it('submits the selected category', () => {
    setup()
    expect(screen.getByTestId('expense-category')).toHaveValue('material')
  })

  it('swaps to the salary fields when Salaries is chosen', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Salaries' }))

    expect(screen.getByLabelText('Salary')).toBeInTheDocument()
    expect(screen.getByLabelText('Employee name')).toBeInTheDocument()
    expect(screen.queryByLabelText('Price')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Shop')).not.toBeInTheDocument()
    expect(screen.getByTestId('expense-category')).toHaveValue('salary')
  })

  it('pre-selects Part time on the employee type radio', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Salaries' }))
    expect(screen.getByRole('radio', { name: 'Part time' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Permanent' })).not.toBeChecked()
  })

  it('lists every business capital type', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Business Capital' }))
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(
      expect.arrayContaining(['Workshop cost', 'Vehicle cost', 'Tools', 'Repair', 'Other']),
    )
  })

  it('shows only price, date and remark for transport', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Transport' }))
    expect(screen.getByLabelText('Price')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Remark')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('lists the shops it was given', () => {
    setup()
    expect(screen.getByRole('option', { name: 'Ajith Hardware' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Nawaloka Timber' })).toBeInTheDocument()
  })

  it('reveals a name input when a new shop is chosen, and hides it again', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.queryByLabelText('New shop name')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Shop'), '__new__')
    expect(screen.getByLabelText('New shop name')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Shop'), 'shop-1')
    expect(screen.queryByLabelText('New shop name')).not.toBeInTheDocument()
  })
})
