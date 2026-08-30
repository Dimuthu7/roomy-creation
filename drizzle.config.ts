import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

// `generate` diffs schema.ts against the migrations folder and needs no live
// connection. `migrate` and the seed script do — they'll fail below with a
// clear error if DATABASE_URL is still unset when that connection is opened.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
