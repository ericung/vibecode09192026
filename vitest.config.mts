import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // `server-only` throws outside Next's react-server condition; stub it so
    // server modules can be unit-tested with mocked fetch.
    alias: [{ find: /^server-only$/, replacement: path.resolve(root, 'test/server-only-stub.ts') }],
  },
  test: {
    environment: 'jsdom',
  },
})
