// No `import 'server-only'` here: this module is also loaded directly by
// scripts/seed.ts via plain Node/tsx, outside any bundler that could alias it away
// (server-only throws unconditionally when it isn't). Its actual app consumers,
// src/data/site.ts and src/data/works.ts, already carry their own guard.
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — copy .env.example to .env.local and fill it in.')
}

export const db = drizzle(process.env.DATABASE_URL, { schema })
