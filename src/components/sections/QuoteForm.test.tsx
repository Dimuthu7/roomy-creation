import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteForm } from './QuoteForm'
import { EnquiryPrefillProvider, useEnquiryPrefill } from '@/context/EnquiryPrefill'
import { enquirySchema } from '@/lib/enquirySchema'

function renderForm() {
  return render(
    <EnquiryPrefillProvider>
      <QuoteForm />
    </EnquiryPrefillProvider>,
  )
}

function PrefillTrigger({ need }: { need: string }) {
  const { prefill } = useEnquiryPrefill()
  return (
    <button type="button" onClick={() => prefill(need)}>
      prefill {need}
    </button>
  )
}

function renderFormWithPrefill() {
  return render(
    <EnquiryPrefillProvider>
      <PrefillTrigger need="wardrobe" />
      <PrefillTrigger need="kitchen" />
      <QuoteForm />
    </EnquiryPrefillProvider>,
  )
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), 'Nimal')
  await user.type(screen.getByLabelText(/phone/i), '0771234567')
  await user.type(screen.getByLabelText(/email/i), 'nimal@example.lk')
  await user.selectOptions(screen.getByLabelText(/property type/i), 'apartment')
  await user.click(screen.getByRole('checkbox', { name: /Wardrobe/i }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('QuoteForm', () => {
  it('names the button exactly "Send enquiry", never "Submit"', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeInTheDocument()
  })

  it('labels every field and the needs fieldset with exact copy', () => {
    renderForm()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Property type')).toBeInTheDocument()
    expect(screen.getByText('What you need')).toBeInTheDocument()
    // The trailing clause is not decoration. Most visitors enquiring about a fitted
    // kitchen have not measured anything, and without permission to say so they either
    // guess a number or abandon the form. It is approved copy — do not shorten it.
    expect(screen.getByText("Rough room dimensions, or 'not sure yet'")).toBeInTheDocument()
    expect(screen.getByText('Budget range (optional)')).toBeInTheDocument()
    expect(screen.getByText('How you found us')).toBeInTheDocument()
  })

  it('promises a reply time in the static footer line', () => {
    renderForm()
    expect(screen.getByText('We reply within one working day.')).toBeInTheDocument()
  })

  it('never uses banned marketing language anywhere in the form', () => {
    const { container } = renderForm()
    const text = container.textContent?.toLowerCase() ?? ''
    for (const banned of [
      'sorry',
      'unfortunately',
      'please',
      'oops',
      'we strive to',
      'dream home',
      'turnkey',
      'one-stop solution',
    ]) {
      expect(text).not.toContain(banned)
    }
    expect(container.textContent).not.toContain('!')
  })

  it('never prints the [TBC] sentinel to the visitor', () => {
    const { container } = renderForm()
    expect(container.textContent).not.toContain('[TBC]')
  })

  it('shows a specific error when a required field is empty', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(await screen.findByText('Enter your name')).toBeInTheDocument()
  })

  it('keeps the first issue per field, so a blank email is not told it is missing a domain', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText(/name/i), 'Nimal')
    await user.type(screen.getByLabelText(/phone/i), '0771234567')
    await user.selectOptions(screen.getByLabelText(/property type/i), 'apartment')
    await user.click(screen.getByRole('checkbox', { name: /Wardrobe/i }))
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(await screen.findByText('Enter an email address')).toBeInTheDocument()
    expect(screen.queryByText('That email address is missing a domain')).toBeNull()
  })

  it('does not submit when validation fails', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('links each error message to its field with aria-describedby', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    const nameInput = await screen.findByLabelText(/name/i)
    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error')
    expect(document.getElementById('name-error')).toHaveTextContent('Enter your name')
  })

  it('moves focus to the first invalid field after a failed validation pass', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    await waitFor(() => expect(screen.getByLabelText(/name/i)).toHaveFocus())
  })

  it('calls the shared schema rather than a hand-rolled copy of its rules', async () => {
    const spy = vi.spyOn(enquirySchema, 'safeParse')
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('shows "Sending" while the request is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve
          }),
      ),
    )
    const user = userEvent.setup()
    renderForm()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    const sendingButton = await screen.findByRole('button', { name: 'Sending' })
    expect(sendingButton).toBeDisabled()
    resolveFetch({ ok: true, json: async () => ({ ok: true }) })
    await screen.findByRole('status')
  })

  it('submits a valid enquiry and shows a real success state', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/enquiry', expect.anything()))
    expect(await screen.findByText('We have your enquiry')).toBeInTheDocument()
    expect(
      screen.getByText('We reply within one working day. If it is urgent, message us on WhatsApp.'),
    ).toBeInTheDocument()
  })

  it('moves focus to the success message so it is not lost on <body>', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    const status = await screen.findByRole('status')
    await waitFor(() => expect(status).toHaveFocus())
  })

  it('reports a failed send without apologising', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const user = userEvent.setup()
    renderForm()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    const alert = await screen.findByText(
      'That did not send. Check your connection and try again, or message us on WhatsApp.',
    )
    expect(alert.textContent?.toLowerCase()).not.toContain('sorry')
    expect(alert.textContent).not.toContain('!')
  })

  it('recovers instead of hanging forever when fetch rejects outright', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const user = userEvent.setup()
    renderForm()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(
      await screen.findByText('That did not send. Check your connection and try again, or message us on WhatsApp.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send enquiry' })).not.toBeDisabled()
  })

  it('contains no iframe or script, and only ever posts to /api/enquiry', async () => {
    const user = userEvent.setup()
    const { container } = renderForm()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith('/api/enquiry', expect.anything())
  })

  it('pre-ticks a need carried over from a gallery card', async () => {
    const user = userEvent.setup()
    renderFormWithPrefill()
    await user.click(screen.getByRole('button', { name: 'prefill wardrobe' }))
    expect(await screen.findByRole('checkbox', { name: /Wardrobe/i })).toBeChecked()
  })

  it('does not re-tick a box the visitor deliberately unticked when another need prefills later', async () => {
    const user = userEvent.setup()
    renderFormWithPrefill()
    await user.click(screen.getByRole('button', { name: 'prefill wardrobe' }))
    const wardrobe = await screen.findByRole('checkbox', { name: /Wardrobe/i })
    expect(wardrobe).toBeChecked()

    await user.click(wardrobe)
    expect(wardrobe).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'prefill kitchen' }))
    const kitchen = await screen.findByRole('checkbox', { name: /Kitchen/i })
    expect(kitchen).toBeChecked()
    expect(wardrobe).not.toBeChecked()
  })
})
