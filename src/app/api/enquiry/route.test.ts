import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enquirySchema } from '@/lib/enquirySchema'

const send = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

const valid = {
  name: 'Nimal',
  phone: '0771234567',
  email: 'nimal@example.lk',
  propertyType: 'apartment',
  needs: ['wardrobe'],
  dimensions: '',
  budget: '',
  source: '',
}

function post(body: unknown) {
  return new Request('http://localhost/api/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postRaw(body: string) {
  return new Request('http://localhost/api/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

beforeEach(() => {
  send.mockReset().mockResolvedValue({ data: { id: 'x' }, error: null })
  vi.stubEnv('RESEND_API_KEY', 'test-key')
  vi.stubEnv('ENQUIRY_TO_EMAIL', 'owner@example.lk')
  vi.stubEnv('ENQUIRY_FROM_EMAIL', 'site@example.lk')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/enquiry', () => {
  it('rejects an invalid payload with 400 and does not send mail', async () => {
    const { POST } = await import('./route')
    const res = await POST(post({ ...valid, needs: [] }))
    expect(res.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it('never leaks the raw Zod issues on a 400 response', async () => {
    const { POST } = await import('./route')
    const res = await POST(post({ ...valid, needs: [] }))
    const body = await res.json()
    expect(body).toEqual({ ok: false })
  })

  it('rejects a malformed JSON body with 400', async () => {
    const { POST } = await import('./route')
    const res = await POST(postRaw('not json{'))
    expect(res.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it('rejects an oversized body with 413 before ever attempting to parse it', async () => {
    const { POST } = await import('./route')
    const oversized = postRaw(JSON.stringify({ ...valid, source: 'a'.repeat(20_000) }))
    const res = await POST(oversized)
    expect(res.status).toBe(413)
    expect(send).not.toHaveBeenCalled()
  })

  it('sends the enquiry and returns 200', async () => {
    const { POST } = await import('./route')
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('returns 502 when the mail provider fails', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'nope' } })
    const { POST } = await import('./route')
    expect((await POST(post(valid))).status).toBe(502)
  })

  it('re-validates server side rather than trusting the client', async () => {
    const { POST } = await import('./route')
    expect((await POST(post({ name: 'x' }))).status).toBe(400)
  })

  it('calls the shared schema rather than a hand-rolled copy of its rules', async () => {
    const spy = vi.spyOn(enquirySchema, 'safeParse')
    const { POST } = await import('./route')
    await POST(post(valid))
    expect(spy).toHaveBeenCalled()
  })

  it('returns 500 and never sends when RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { POST } = await import('./route')
    const res = await POST(post(valid))
    expect(res.status).toBe(500)
    expect(send).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY'))
  })

  it('returns 500 and never sends when ENQUIRY_TO_EMAIL is missing', async () => {
    vi.stubEnv('ENQUIRY_TO_EMAIL', '')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { POST } = await import('./route')
    const res = await POST(post(valid))
    expect(res.status).toBe(500)
    expect(send).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ENQUIRY_TO_EMAIL'))
  })

  it('returns 500 and never sends when ENQUIRY_FROM_EMAIL is missing', async () => {
    vi.stubEnv('ENQUIRY_FROM_EMAIL', '')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { POST } = await import('./route')
    const res = await POST(post(valid))
    expect(res.status).toBe(500)
    expect(send).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ENQUIRY_FROM_EMAIL'))
  })

  it('uses ENQUIRY_FROM_EMAIL as the sender rather than a hardcoded domain', async () => {
    vi.stubEnv('ENQUIRY_FROM_EMAIL', 'quotes@configured-domain.example')
    const { POST } = await import('./route')
    await POST(post(valid))
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'quotes@configured-domain.example' }),
    )
  })

  it('replies to the visitor using the camelCase replyTo option', async () => {
    const { POST } = await import('./route')
    await POST(post(valid))
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ replyTo: valid.email }))
  })

  it('collapses whitespace in the subject so a newline cannot inject a header', async () => {
    const { POST } = await import('./route')
    await POST(post({ ...valid, name: 'Nimal\nBcc: victim@example.com' }))
    const call = send.mock.calls[0][0]
    expect(call.subject).not.toContain('\n')
    expect(call.subject).toBe('Quotation request — Nimal Bcc: victim@example.com, apartment')
  })
})
