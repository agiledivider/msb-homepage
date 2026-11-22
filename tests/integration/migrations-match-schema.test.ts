/**
 * Every real database is built by migrations (D-010); only test DBs use push.
 * This builds a fresh DB from src/migrations and compares its tables and columns
 * with the schema push derives from the current config. It fails when a schema
 * change ships without a migration, and when a migration can't run from scratch
 * (e.g. a data step using the Local API before later tables exist).
 */
import { execFile } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const run = promisify(execFile)
const STRUCTURE = `select m.name || '.' || p.name || ':' || p.type || ':' || p."notnull" as col
  from sqlite_master m join pragma_table_info(m.name) p
  where m.type = 'table' and m.name not like 'sqlite_%' order by 1`

function structure(url: string): string[] {
  const db = new DatabaseSync(url.replace(/^file:/, ''), { readOnly: true })
  try {
    return db
      .prepare(STRUCTURE)
      .all()
      .map((r) => String(r.col))
  } finally {
    db.close()
  }
}

let destroy: (() => Promise<void>) | undefined

beforeAll(async () => {
  // Boots Payload on this file's throwaway DB, which push builds from the config.
  const { getPayloadClient } = await import('@/lib/getPayload')
  const payload = await getPayloadClient()
  destroy = () => payload.destroy()
})

afterAll(async () => {
  await destroy?.()
})

describe('migrations', () => {
  it('build exactly the schema of the current config, from an empty database', async () => {
    const url = `file:${path.join(mkdtempSync(path.join(tmpdir(), 'msb-mig-')), 'migrated.db')}`
    await run(path.resolve('node_modules/.bin/payload'), ['migrate'], {
      env: { ...process.env, DATABASE_URI: url, NODE_ENV: 'production', PAYLOAD_SECRET: 'test' },
      timeout: 120_000,
    })

    const fromMigrations = structure(url)
    const fromConfig = structure(String(process.env.DATABASE_URI))
    expect(fromMigrations.length).toBeGreaterThan(100)
    expect(fromMigrations).toEqual(fromConfig)
  }, 150_000)
})
