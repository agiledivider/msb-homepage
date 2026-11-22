/**
 * Fitness: every custom MCP tool ships with its migration.
 *
 * @payloadcms/plugin-mcp adds a per-key checkbox column
 * `payload_mcp_tool_<snake_name>` to `payload_mcp_api_keys` for each custom
 * tool. Dev pushes the schema, but production only runs migrations: a tool
 * without one never shows up for Claude in production (previewLink, 2026-11-22).
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const MCP_DIR = path.join(ROOT, 'src/plugins/mcp')
const MIGRATIONS = path.join(ROOT, 'src/migrations')

const snake = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

const toolNames = readdirSync(MCP_DIR)
  .filter((f) => f.endsWith('.ts'))
  .flatMap((f) => {
    const src = readFileSync(path.join(MCP_DIR, f), 'utf8')
    return /export const make\w+Tool\b/.test(src) ? [...src.matchAll(/^\s+name: '(\w+)',$/gm)].map((m) => m[1]) : []
  })

const migrationSql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => readFileSync(path.join(MIGRATIONS, f), 'utf8'))
  .join('\n')

describe('custom MCP tools (fitness)', () => {
  it('finds the custom tools', () => {
    expect(toolNames).toEqual(expect.arrayContaining(['uploadMedia', 'previewLink']))
  })

  it.each(toolNames)('%s has a migration for its key column', (name) => {
    expect(migrationSql).toContain(`payload_mcp_tool_${snake(name)}`)
  })
})
