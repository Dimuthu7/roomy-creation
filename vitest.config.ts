import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Uncapped, `vitest run` spawns one worker per core. jsdom does no real layout or
    // paint, so anything timing-sensitive (Headless UI's Listbox transitions in
    // QuoteForm, in particular) can occasionally miss its window when that many worker
    // processes compete for the CPU at once — never reproduces in a real browser, and
    // never reproduces running a single file in isolation, only under this specific
    // oversubscription. Capped at half the machine's cores rather than a fixed number
    // so it still scales down sensibly on smaller CI runners.
    maxWorkers: '50%',
  },
})
