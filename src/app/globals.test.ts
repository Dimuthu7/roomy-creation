import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// jsdom applies no stylesheets, so a rendered component can never prove this. Reading
// the file is the only assertion available — and it is worth making, because deleting
// the rule breaks every anchor on the site silently, in a way no component test and no
// type check would ever notice.
//
// Resolved from the vitest root rather than `import.meta.url`: under this vite
// transform `import.meta.url` is not a file: URL, and fileURLToPath throws
// `TypeError: The URL must be of scheme file`.
const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('globals.css', () => {
  it('offsets anchor targets from under the fixed nav', () => {
    expect(css).toMatch(/scroll-padding-top:\s*5rem/)
  })
})
