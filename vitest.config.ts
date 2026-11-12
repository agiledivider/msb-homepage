import path from 'node:path'
import { defineConfig } from 'vitest/config'

const src = path.resolve(import.meta.dirname, 'src')

export default defineConfig({
  resolve: {
    alias: [
      { find: '@payload-config', replacement: path.join(src, 'payload.config.ts') },
      { find: /^@\/(.*)$/, replacement: `${src}/$1` },
    ],
  },
  test: {
    environment: 'node',
    // payload-rbac-plugin and payload-oauth2 ship extensionless ESM imports Node can't resolve; let Vite transform it.
    server: { deps: { inline: ['payload-rbac-plugin', 'payload-oauth2'] } },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Tier B tests boot Payload against their own temp SQLite file; one file at a time.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
