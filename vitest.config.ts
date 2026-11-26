import { availableParallelism } from 'node:os'
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
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    // Test files run in parallel (S6.9): tests/setup.ts gives every file its own
    // temp dir, SQLite DB and media folder, so Tier B files that boot Payload
    // never share state. Most of a file's time is that boot, not its tests.
    // At least two workers: Vitest's default (cores − 1) leaves a 2-core CI
    // runner with one, i.e. no parallelism at all (CI test step 1 min 54 s).
    maxWorkers: Math.max(2, availableParallelism()),
    // Tests must not depend on order, so every run shuffles files and tests.
    // A failure that only shows up in some orders: rerun with the printed seed,
    // `pnpm vitest run --sequence.seed=<seed>`.
    sequence: { shuffle: true },
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
