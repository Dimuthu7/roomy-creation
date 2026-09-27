import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompleteOrderButton } from './CompleteOrderButton'

vi.mock('../actions', () => ({ completeJob: vi.fn() }))

let confirmSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => {
  confirmSpy.mockRestore()
})

describe('CompleteOrderButton', () => {
  it('names the outstanding amount when a balance is owed', async () => {
    const user = userEvent.setup()
    render(<CompleteOrderButton jobId="job-1" balanceCents={125_000_00} completedAt={null} />)

    await user.click(screen.getByRole('button', { name: /complete order/i }))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('125,000.00'))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('pending payment'))
  })

  it('asks plainly when the order is paid in full', async () => {
    const user = userEvent.setup()
    render(<CompleteOrderButton jobId="job-1" balanceCents={0} completedAt={null} />)

    await user.click(screen.getByRole('button', { name: /complete order/i }))

    const message = confirmSpy.mock.calls[0][0] as string
    expect(message).toContain('Complete this order?')
    expect(message).not.toContain('pending payment')
  })

  it('calls out an overpayment rather than folding it into "paid in full"', async () => {
    const user = userEvent.setup()
    render(<CompleteOrderButton jobId="job-1" balanceCents={-5_000_00} completedAt={null} />)

    await user.click(screen.getByRole('button', { name: /complete order/i }))

    const message = confirmSpy.mock.calls[0][0] as string
    expect(message).toContain('overpaid')
    expect(message).toContain('5,000.00')
  })

  it('renders the completion date instead of a button once the job is finished', () => {
    render(<CompleteOrderButton jobId="job-1" balanceCents={0} completedAt="2026-09-22T10:30:00.000Z" />)

    expect(screen.queryByRole('button', { name: /complete order/i })).not.toBeInTheDocument()
    expect(screen.getByText(/completed on/i)).toBeInTheDocument()
  })

  it('renders nothing when the job has no resolved total to settle against', () => {
    const { container } = render(<CompleteOrderButton jobId="job-1" balanceCents={null} completedAt={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
