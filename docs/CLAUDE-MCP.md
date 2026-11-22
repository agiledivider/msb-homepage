# Claude in the CMS (MCP)

Editors let Claude create and update blog posts, events and pages, for example
from a flyer, a mail or notes. Claude works with the editor's own CMS rights and
**only writes drafts**: nothing goes live until the editor submits it and a
reviewer approves it in the CMS, as with any other draft.

## For editors

1. In the CMS, open **Verwaltung → KI-Zugänge → Neu**, give the key a name
   (e.g. "Claude Laptop"), tick **Enable API Key** and copy the key. Create,
   update and find are allowed by default; untick what you don't want Claude to do.
2. Connect Claude to `https://<CMS address>/api/mcp` with the header
   `Authorization: Bearer <key>`:
   - **Claude Code:**
     `claude mcp add --transport http msb-cms https://<CMS address>/api/mcp --header "Authorization: Bearer <key>"`
   - **Claude Desktop:** in `claude_desktop_config.json` under `mcpServers`:
     ```json
     "msb-cms": {
       "command": "npx",
       "args": ["-y", "mcp-remote", "https://<CMS address>/api/mcp",
                "--header", "Authorization: Bearer ${MSB_CMS_KEY}"],
       "env": { "MSB_CMS_KEY": "<key>" }
     }
     ```
3. Ask, e.g. "Leg aus diesem Flyer einen Termin an: …". Claude answers with the
   draft it created. Open it in the CMS, check it, and submit it for review.

The key acts as you. Treat it like a password: don't share it, and delete it
under KI-Zugänge if a device is lost.

## What Claude can and can't do

| Can | Can't |
|---|---|
| find, create and update blog posts, events and pages, as far as your own role allows | publish, approve, submit for review or delete anything |
| find media and attach existing images by ID | change or delete existing media |
| upload images (JPEG, PNG, GIF, WebP) and PDFs up to 10 MB, from a public https URL or as base64 content | upload SVG or other file types |
| | change settings, users, roles, folders |
| show a blog post or event as it would go live (homepage hero + its own page) via a 15-minute preview link | preview pages |

- Everything Claude writes is a **draft**: on a new document it's the only
  version; on a live page it's a new draft version next to the live one, which
  stays online unchanged.
- "Erstellt von" shows the key's owner; review fields can't be set by Claude.
- **Uploads are public right away** (media has no drafts) and carry the
  "Von Claude hochgeladen" marker, also as a column in the media list. The static
  site only copies a file once a published post or event uses it.
- An image dropped into a chat can't be uploaded as a file: Claude sees the
  picture, not its bytes. Give a link, or use Claude Code / Desktop on a file on disk.
- Without a valid key the endpoint answers 401.
- **Preview links** (`previewLink`) need no login and work for anyone who has
  the link, for 15 minutes, and show only that one post or event. They aren't
  indexed and don't leak via Referer.

## How it works (for developers)

- `@payloadcms/plugin-mcp` (`src/plugins/mcp/index.ts`) serves `/api/mcp`.
  Keys live in `payload-mcp-api-keys`, each bound to the user who created it.
- `overrideAuth` reloads the key's user with roles and permissions; the plugin
  loads it without them, which would fail every RBAC check.
- `mcpDraftOnly` (editorial plugin, `beforeOperation`) forces Payload's `draft`
  flag and drops review fields for every request with `payloadAPI === 'MCP'`.
- `requireCmsUserByDefault` (`src/access/requireCmsUser.ts`): every access rule a
  collection or global leaves unset means "a real CMS user", so a key can never
  count as logged in on REST. In Payload 3.93 a raw key doesn't authenticate REST
  at all; this is the second layer.
- `uploadMedia` (`src/plugins/mcp/uploadMedia.ts`) is a custom MCP tool: the
  file type comes from the file's bytes (`mediaFile.ts`), never from the name.
  URLs go through `fetchPublicFile.ts`: https on port 443 only, every resolved
  address must be public (checked in the connection's own DNS lookup, so DNS
  rebinding can't slip through), max 3 redirects, 10 MB, 15 s.
- Deleting a user deletes their keys first (the plugin's `user_id` is NOT NULL
  with `ON DELETE set null`, which otherwise blocks the delete).
- `previewLink` (`src/plugins/mcp/previewLink.ts`) signs a token (HMAC with a
  key derived from the Payload secret, 15 min, `src/lib/previewToken.ts`) for
  one blog post or event the key owner can read. `/preview/link?t=…` renders
  hero + article via `findByPreviewToken` in `publicData.ts`. It deliberately
  does **not** enable Next draft mode: that cookie would show every draft.
- Tests: `tests/integration/mcp.test.ts` drives the real endpoint handler;
  `tests/unit/preview-token.test.ts` covers forged/expired tokens.

**Known gap:** roles follow Kanidm only at login. A key keeps working with the
roles its owner had at their last login, even after Kanidm removed them. To cut
someone off, delete their CMS account (which deletes their keys) or their keys.
