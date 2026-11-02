import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Public file storage for admin uploads (gallery photos) and generated documents
// (quotation/order/receipt/completion PDFs and DOCX files), backed by the Cloudflare R2
// bucket bound as UPLOADS in wrangler.jsonc. Files are written through the Worker
// binding — no API keys — and read back by visitors straight from the bucket's public
// address, R2_PUBLIC_URL (the bucket's r2.dev address, or a custom domain on it).

interface UploadsBucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | Blob | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>
  delete(key: string): Promise<void>
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
}

function publicBaseUrl(): string {
  const base = process.env.R2_PUBLIC_URL
  if (!base) {
    throw new Error('R2_PUBLIC_URL is not set — copy .env.example to .env.local and fill it in.')
  }
  return base.replace(/\/+$/, '')
}

function uploadsBucket(): UploadsBucket {
  const bucket = (getCloudflareContext().env as unknown as { UPLOADS?: UploadsBucket }).UPLOADS
  if (!bucket) {
    throw new Error('The UPLOADS R2 binding is missing — check r2_buckets in wrangler.jsonc.')
  }
  return bucket
}

function contentTypeFor(pathname: string, body: unknown): string {
  if (body instanceof Blob && body.type) return body.type
  const extension = pathname.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[extension] ?? 'application/octet-stream'
}

/** Stores `body` at `pathname` and returns the public URL it is served from. Every
 *  caller puts a timestamp in the pathname, so a stored file never changes and can be
 *  cached by browsers indefinitely. */
export async function uploadPublicFile(
  pathname: string,
  body: Buffer | Uint8Array | ArrayBuffer | Blob
): Promise<{ url: string }> {
  const key = pathname.replace(/^\/+/, '')
  // R2 takes a Blob as-is; a Node Buffer is passed as a plain byte view of itself.
  const value = body instanceof Blob || body instanceof ArrayBuffer ? body : new Uint8Array(body)
  await uploadsBucket().put(key, value, {
    httpMetadata: {
      contentType: contentTypeFor(key, body),
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })
  return { url: `${publicBaseUrl()}/${key.split('/').map(encodeURIComponent).join('/')}` }
}

/** Deletes a file previously returned by uploadPublicFile. A URL that isn't in this
 *  bucket (e.g. a file still on Vercel Blob from before the move to Cloudflare) is left
 *  alone. */
export async function deletePublicFile(url: string): Promise<void> {
  const prefix = `${publicBaseUrl()}/`
  if (!url.startsWith(prefix)) return
  const key = url.slice(prefix.length).split('/').map(decodeURIComponent).join('/')
  await uploadsBucket().delete(key)
}
