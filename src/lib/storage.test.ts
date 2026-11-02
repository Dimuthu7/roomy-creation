import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const put = vi.fn()
const del = vi.fn()
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({ env: { UPLOADS: { put, delete: del } } }),
}))

import { deletePublicFile, uploadPublicFile } from './storage'

beforeEach(() => {
  put.mockReset()
  del.mockReset()
  vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc.r2.dev/')
})

describe('uploadPublicFile', () => {
  it('stores a PDF buffer with its content type and returns its public URL', async () => {
    const result = await uploadPublicFile('quotations/RC00195-1.pdf', Buffer.from('%PDF'))

    expect(result.url).toBe('https://pub-abc.r2.dev/quotations/RC00195-1.pdf')
    expect(put).toHaveBeenCalledWith('quotations/RC00195-1.pdf', expect.any(Uint8Array), {
      httpMetadata: { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' },
    })
  })

  it('uses an uploaded file’s own type', async () => {
    await uploadPublicFile('work/a-1.jpg', new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(put.mock.calls[0][2].httpMetadata.contentType).toBe('image/jpeg')
  })

  it('fails clearly when R2_PUBLIC_URL is missing', async () => {
    vi.stubEnv('R2_PUBLIC_URL', '')
    await expect(uploadPublicFile('a.pdf', Buffer.from(''))).rejects.toThrow('R2_PUBLIC_URL')
  })
})

describe('deletePublicFile', () => {
  it('deletes a file stored in the bucket by its key', async () => {
    await deletePublicFile('https://pub-abc.r2.dev/orders/RC00195-1.pdf')
    expect(del).toHaveBeenCalledWith('orders/RC00195-1.pdf')
  })

  it('leaves a file from elsewhere (old Vercel Blob URL) alone', async () => {
    await deletePublicFile('https://x.public.blob.vercel-storage.com/orders/a.pdf')
    expect(del).not.toHaveBeenCalled()
  })
})
