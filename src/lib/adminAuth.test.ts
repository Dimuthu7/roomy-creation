import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkCredentials, isValidSessionToken, issueToken } from './adminAuth'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.ADMIN_USERNAME = 'admin'
  process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
  process.env.ADMIN_SESSION_SECRET = 'test-secret-only-used-in-this-file'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.useRealTimers()
})

describe('checkCredentials', () => {
  it('accepts the exact configured username and password', () => {
    expect(checkCredentials('admin', 'correct-horse-battery-staple')).toBe(true)
  })

  it('rejects a wrong password', () => {
    expect(checkCredentials('admin', 'wrong')).toBe(false)
  })

  it('rejects a wrong username', () => {
    expect(checkCredentials('nope', 'correct-horse-battery-staple')).toBe(false)
  })

  it('rejects both fields wrong', () => {
    expect(checkCredentials('nope', 'wrong')).toBe(false)
  })

  it('throws when ADMIN_USERNAME/ADMIN_PASSWORD are not configured', () => {
    delete process.env.ADMIN_USERNAME
    delete process.env.ADMIN_PASSWORD
    expect(() => checkCredentials('admin', 'correct-horse-battery-staple')).toThrow()
  })
})

describe('isValidSessionToken', () => {
  it('rejects undefined (no cookie at all)', () => {
    expect(isValidSessionToken(undefined)).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidSessionToken('')).toBe(false)
  })

  it('rejects a token with no signature segment', () => {
    expect(isValidSessionToken('not-a-real-token')).toBe(false)
  })

  it('rejects a token whose payload is not valid base64url JSON', () => {
    expect(isValidSessionToken('not-json.somesignature')).toBe(false)
  })

  it('accepts a token freshly issued with the configured secret', () => {
    expect(isValidSessionToken(issueToken())).toBe(true)
  })

  it('rejects a token signed under a different secret', () => {
    const token = issueToken()
    process.env.ADMIN_SESSION_SECRET = 'a-different-secret'
    expect(isValidSessionToken(token)).toBe(false)
  })

  it('rejects a token whose payload was tampered with after signing', () => {
    const [payload, signature] = issueToken().split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...decoded, expiresAt: decoded.expiresAt + 1_000_000 }),
    ).toString('base64url')
    expect(isValidSessionToken(`${tamperedPayload}.${signature}`)).toBe(false)
  })

  it('rejects a token past its expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = issueToken()
    // ~30 days is the session duration — 31 days later it must be expired.
    vi.setSystemTime(new Date('2026-02-01T00:00:00Z'))
    expect(isValidSessionToken(token)).toBe(false)
  })

  it('still accepts a token just short of its expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = issueToken()
    vi.setSystemTime(new Date('2026-01-30T23:00:00Z'))
    expect(isValidSessionToken(token)).toBe(true)
  })
})
