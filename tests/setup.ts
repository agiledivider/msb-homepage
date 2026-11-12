import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Must run before anything imports @payload-config: the config reads env when the
// module loads. Each test file gets a throwaway SQLite DB; `push: true` builds it.
const dir = mkdtempSync(path.join(tmpdir(), 'msb-test-'))
process.env.DATABASE_URI = `file:${path.join(dir, `t-${process.pid}.db`)}`
process.env.PAYLOAD_SECRET = 'test'
// Uploads made by tests (e.g. the seed) land in the temp dir, not public/media.
process.env.MEDIA_DIR = path.join(dir, 'media')
process.env.DISABLE_PAYLOAD_HMR = 'true'
delete process.env.KANIDM_ISSUER
delete process.env.KANIDM_CLIENT_ID
delete process.env.KANIDM_CLIENT_SECRET
delete process.env.PUBLISHER_URL
