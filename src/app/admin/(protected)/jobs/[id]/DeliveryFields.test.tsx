import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeliveryFields } from './DeliveryFields'

describe('DeliveryFields', () => {
  it('hides the amount field when free delivery is ticked', () => {
    render(<DeliveryFields freeDelivery deliveryCharge="" />)
    expect(screen.getByLabelText(/free delivery/i)).toBeChecked()
    expect(screen.queryByLabelText(/delivery charge/i)).not.toBeInTheDocument()
  })

  it('shows the amount field when free delivery is unticked', () => {
    render(<DeliveryFields freeDelivery={false} deliveryCharge="" />)
    expect(screen.getByLabelText(/delivery charge/i)).toBeInTheDocument()
  })

  it('reveals the amount field when the box is unticked by the user', async () => {
    const user = userEvent.setup()
    render(<DeliveryFields freeDelivery deliveryCharge="" />)
    await user.click(screen.getByLabelText(/free delivery/i))
    expect(screen.getByLabelText(/delivery charge/i)).toBeInTheDocument()
  })

  it('hides it again when the box is re-ticked', async () => {
    const user = userEvent.setup()
    render(<DeliveryFields freeDelivery={false} deliveryCharge="5000" />)
    await user.click(screen.getByLabelText(/free delivery/i))
    expect(screen.queryByLabelText(/delivery charge/i)).not.toBeInTheDocument()
  })

  it('keeps a previously entered amount when the field is hidden and shown again', async () => {
    const user = userEvent.setup()
    render(<DeliveryFields freeDelivery={false} deliveryCharge="5,000.00" />)
    await user.click(screen.getByLabelText(/free delivery/i))
    await user.click(screen.getByLabelText(/free delivery/i))
    expect(screen.getByLabelText(/delivery charge/i)).toHaveValue('5,000.00')
  })
})
