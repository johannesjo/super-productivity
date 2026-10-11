# Hosted capture connector: "add a task" from any assistant

**Status:** Plan, not reviewed · **Date:** 2026-10-11
**Companions:** `2026-09-22-local-desktop-mcp.md` (local MCP, PR #10251) and
`2026-09-22-native-capture-ios-android.md` (on-device capture). This plan
deliberately reverses that plan's "hosted capture … stay deferred" line, for
**capture only**.

## Decision

Add an opt-in, **write-only** remote MCP endpoint to the SuperSync server with
one tool, `add_task(title, notes?)`. The server never creates sync operations.
It encrypts each capture to a public key the user's own devices registered,
stores it in a small per-user queue, and the app turns each queued capture into
one Inbox task through the existing `NativeCaptureImporter` after a successful
sync.

One connector added on claude.ai then works in Claude on the web, Desktop and
mobile, in Cowork, and in Claude Code (CLI and cloud sessions). The same
endpoint works for any other MCP client that speaks OAuth with CIMD, ChatGPT
included.

**Out of scope:** reading tasks, editing, choosing a project, tag or due date,
users of other sync providers (WebDAV, Dropbox, local file), and server-side
op creation.

## 1. Why, and why this shape

- **Demand.** "Please make a task in Super Productivity" from any assistant
  session is the maintainer's own top ask (2026-10-11). The two community MCP
  servers listed in `community-plugins.json` (≈120★ and ≈81★, checked 2026-09)
  show the same demand, but they are desktop-only. Remote connectors are the
  only thing that Claude mobile and cloud sessions can call: they run from
  Anthropic's cloud (egress `160.79.104.0/21`), so localhost and #10251 can't
  be reached.
- **Capture only.** Adding a task needs no read access. That removes the
  blockers that ruled out a hosted connector on 2026-10-06:
  - **E2EE stays intact.** SuperSync E2EE is mandatory and the server holds
    no key (`violatesE2eeGate`, `sync.routes.payload.ts:47`). A write-only
    queue never needs to read user data, and §4 keeps it encrypted at rest.
  - **Sync correctness is untouched.** The server writes no ops. The client
    creates the task as one ordinary local `addTask`, with its own vector
    clock, on the same path native capture already uses.
  - **Offline first is untouched.** If no device is online, captures wait in
    the queue. Nothing in the app depends on the endpoint.
- **SuperSync only.** It is the only provider with a server we run. Users of
  other providers keep #10251 (local desktop) and native capture.
- **No new dependencies.** Fastify, Prisma and Node `crypto` on the server;
  WebCrypto on the client. ECDH P-256 is used rather than X25519 because
  every WebView and Electron version we ship supports it in WebCrypto.

## 2. Experience

1. In the app, under SuperSync settings: **"Let AI assistants add tasks"**
   (off by default). Switching it on registers this account's capture key
   (§4) and shows the connector URL, e.g.
   `https://sync.super-productivity.com/mcp`, with a copy button and a
   one-line hint per client (claude.ai: Settings → Connectors → Add custom
   connector; Claude Code: `claude mcp add --transport http sp <url>`).
2. In claude.ai, the user adds the URL and signs in once: the SuperSync
   sign-in page (passkey or magic link), then a consent screen naming the
   client and its redirect host and stating the one permission: "Add tasks to
   your Super Productivity Inbox. It can't read your tasks."
3. Anywhere afterwards: "make a task to renew the passport" → the tool
   answers "Saved. It will appear in your Super Productivity Inbox the next
   time the app syncs."
4. The next sync on any device with SuperSync creates one Inbox task.
5. The settings section lists connected assistants (client name, created,
   last used), each with **Revoke**. Switching the feature off revokes every
   grant and deletes the key and all pending captures.

## 3. Server (packages/super-sync-server)

### Tables (Prisma, `onDelete: Cascade` on `userId`)

| Table              | Columns (essentials)                                                                                                               | Purpose                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `capture_keys`     | `userId` (PK), `publicKey` (SPKI, base64), `wrappedPrivateKey` (opaque blob from the client), `createdAt`                          | Exists only while the feature is on. Its absence means "off": `add_task` and authorization both refuse. |
| `capture_grants`   | `id`, `userId`, `clientId` (CIMD URL), `clientName`, `accessTokenHash`, `refreshTokenHash`, `expiresAt`, `lastUsedAt`, `revokedAt` | One row per connected assistant. Tokens are opaque random values. Only SHA-256 hashes are stored.       |
| `capture_items`    | `id` (task-id compatible nanoid), `userId`, `grantId`, `ciphertext`, `createdAt`, `claimedByClientId?`, `claimedUntil?`            | The queue.                                                                                              |
| `oauth_auth_codes` | `codeHash`, `userId`, `clientId`, `redirectUri`, `codeChallenge`, `resource`, `expiresAt` (60 s)                                   | Short-lived authorization codes. Single use.                                                            |

### Credentials are a separate token type

The sync JWT is a 365-day full-power token checked only for `userId` and
`tokenVersion` (`auth.ts:186-260`). Capture tokens must never be accepted by
`/api/sync/*`, and sync JWTs must never be accepted by `/mcp`. Opaque hashed
tokens in their own table give that split structurally: `authenticate`
never sees them, and the `/mcp` handler only looks up `capture_grants`. Access
tokens live 1 hour; refresh tokens rotate on every use (public clients) and a
reused refresh token revokes the grant. `revokeAllTokens` / `replaceToken`
also revoke all capture grants.

### OAuth 2.1 (only what Claude and ChatGPT need)

- `GET /.well-known/oauth-protected-resource/mcp` (RFC 9728): `resource` is
  exactly `${PUBLIC_URL}/mcp`, one `authorization_servers` entry,
  `scopes_supported: ["tasks:capture"]`.
- `GET /.well-known/oauth-authorization-server` (RFC 8414): authorization and
  token endpoints, `code_challenge_methods_supported: ["S256"]`,
  `token_endpoint_auth_methods_supported: ["none"]`,
  `client_id_metadata_document_supported: true`, `grant_types_supported:
["authorization_code", "refresh_token"]`, `scopes_supported: ["tasks:capture"]`.
- **CIMD only, no DCR.** Claude, Claude Code and ChatGPT all publish CIMD
  documents, and MCP 2026-07-28 deprecates DCR. The server fetches the
  `client_id` URL (https only, 10 s timeout, size cap, short cache) and checks
  that the requested `redirect_uri` is listed in it. Loopback redirects
  (`http://localhost`, `http://127.0.0.1`, any port) are accepted only for
  clients whose metadata lists them, for Claude Code.
- `GET /oauth/authorize`: requires PKCE S256 and the RFC 8707 `resource`
  parameter. It renders a page from `pages.ts`. The user signs in with the
  existing passkey or magic-link flow and then consents. The page refuses
  with a clear message when the feature is off (no `capture_keys` row). The
  response includes RFC 9207 `iss`.
- `POST /oauth/token`: form-encoded, `authorization_code` and
  `refresh_token` grants, `invalid_grant` for dead codes or tokens.
- Unauthenticated `/mcp` requests get **401** with
  `WWW-Authenticate: Bearer resource_metadata="…", scope="tasks:capture"`.

Reachability: no new WAF rules on the hosted server today; if one is added,
`160.79.104.0/21` must pass on both `/mcp` and `/oauth/*`.

### MCP endpoint `/mcp`

- Streamable HTTP, stateless, JSON responses, protocol **2025-11-25**: the
  same choice and reasons as #10251 (Claude documents auth support up to
  2025-11-25; dual-era clients fall back to it).
- Methods: `initialize`, `notifications/initialized`, `ping`, `tools/list`,
  `tools/call`. Built in-repo, no SDK (AGENTS.md dependency rule).
  **If #10251 lands first, extract its protocol handler into a shared
  package instead of writing a second one** (open question 5).
- One tool, `add_task`:
  - input: `title` (string, 1–500 chars after trim), `notes` (optional,
    ≤ 8 KiB). Same limits as #10251's `assistant-capture-input.ts`.
  - description tells the model what happens and that the task appears on
    next sync, and that `#tag`/`+project` text is kept literally.
  - result: `"Saved. It will appear in your Super Productivity Inbox the next
time the app syncs."` The tool never claims the task exists.
- Encrypts the capture JSON `{ v: 1, title, notes, createdAt, client }` to
  the user's public key (§4) before the insert. The plaintext exists only in
  the request handler's memory and is never logged.
- Limits (new public write surface, so these are baseline, not speculative
  hardening): Fastify per-route `bodyLimit` 16 KiB; 30 calls/minute per grant
  through the existing per-user limiter; at most 500 pending items per user,
  answered with a tool error "Your Super Productivity capture queue is full.
  Open the app to sync."

### Endpoints for the app (behind the normal `authenticate`)

| Route                                                       | Use                                                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `PUT /api/capture/key`                                      | Register or replace `publicKey` + `wrappedPrivateKey` (feature on, password change).          |
| `GET /api/capture/key`                                      | Fetch the wrapped private key on another device.                                              |
| `DELETE /api/capture/key`                                   | Feature off: delete key, all grants and all pending items in one transaction.                 |
| `POST /api/capture/claim`                                   | Atomically claim up to 50 unclaimed (or lease-expired) items for this `clientId`, lease 24 h. |
| `POST /api/capture/ack`                                     | Delete acknowledged items, only if claimed by this `clientId`.                                |
| `GET /api/capture/grants`, `DELETE /api/capture/grants/:id` | List and revoke connected assistants.                                                         |

`GET /api/sync/status` gains `pendingCaptures: number` so the app can skip the
claim call when there is nothing to fetch. A new item also sends a WebSocket
message `{ type: 'captures_available' }` to the user's connected clients; the
client's message switch (`super-sync-websocket.service.ts:266`) ignores
unknown types, so old clients are unaffected.

### Retention and quota

- A new step in `runDailyCleanup` (`cleanup.ts:24`) deletes items older than
  `RETENTION_DAYS` (45) and expired auth codes, and revokes grants unused for
  180 days.
- Items are tiny and capped at 500, so they don't count against
  `storage_used_bytes`.

### Self-hosting

`CAPTURE_CONNECTOR_ENABLED` (default `false`) gates every route above, so a
self-hosted server only exposes them when its operator opts in. The hosted
server turns it on. `PUBLIC_URL` must be https in production (already
enforced), and it becomes the OAuth issuer and resource.

## 4. Encryption at rest

The server must be able to encrypt without being able to decrypt, so the
existing symmetric scheme (Argon2id → AES-256-GCM, `sync-core/src/encryption.ts`)
can't be used directly. Add a small sealed-box scheme in `packages/sync-core`:

- **Key pair:** ECDH P-256, generated in WebCrypto by the device that switches
  the feature on.
- **Sharing the private key across devices:** the private key (PKCS#8) is
  encrypted with the existing E2EE path (the user's encryption password) and
  uploaded as `wrappedPrivateKey`. Any device that can sync can unwrap it; the
  server can't. Unwrapped keys stay in memory or in the device-local
  credential store, never in synced state.
- **Sealing (server, Node `crypto`):** ephemeral P-256 key pair → ECDH with
  the user's public key → HKDF-SHA-256 (info `sp-capture-v1`) → AES-256-GCM.
  Wire format, base64: `[version 1][ephemeral public key 65][iv 12][ct+tag]`.
- **Password change:** `encryption-password-change.service.ts` re-wraps the
  private key and re-uploads it. Pending captures are unaffected, because they
  are sealed to the public key, which doesn't change.
- **What this does and doesn't protect.** Stored captures, backups and
  database dumps hold only ciphertext. The server process and the assistant
  provider see the plaintext while the request is handled; that is unavoidable
  for any connector and the docs and consent screen must say so.

## 5. Client (app)

- **Provider methods** in `packages/sync-providers/src/super-sync/super-sync.ts`,
  next to `getDevices()`: `claimCaptures()`, `ackCaptures(ids)`,
  `get/put/deleteCaptureKey()`, `listCaptureGrants()`, `revokeCaptureGrant(id)`,
  with response validators in the app factory.
- **`SuperSyncCaptureSource implements NativeCaptureSource<ServerCapture>`:**
  - `getPending` = claim, then decrypt; an item that fails to decrypt is
    left un-acked and logged by id and error code only.
  - `createTask` mirrors `IosShareService`: one `TaskSharedActions.addTask`
    with `id = capture.id`, `INBOX_PROJECT`, `isIgnoreShortSyntax: true`, and
    `defaultEstimate` folded in like #10251's `AssistantCaptureService` (one
    op, not two).
  - `acknowledge` = ack.
  - Runs through `NativeCaptureImporter.importPending()`, which already waits
    for hydration and initial sync, skips ids that exist as tasks, flushes
    writes and only acks persisted tasks.
- **Trigger:** detached after a successful SuperSync sync, next to
  `_applyTrackingPresenceGate()` in `SyncWrapperService._syncBody`
  (~`sync-wrapper.service.ts:895`), only when `pendingCaptures > 0` or a
  `captures_available` message arrived. It must not run inside the sync window
  (the importer waits for `isInSyncWindow` to clear).
- **Settings UI:** fields in the existing SuperSync settings section (no new
  section): the switch, the URL with copy button, the grants list with Revoke.
  The switch state is derived from the server (`GET /api/capture/key`), so no
  persisted or synced model field is added.

## 6. Sync-correctness and long-term cost

- **Ops:** one capture = one `addTask` from one client (rule "one user intent
  = one op"). No meta-reducer, no multi-entity action, no new action type, no
  `CURRENT_SCHEMA_VERSION` change, no synced model change.
- **Two devices, one capture.** The claim lease hands each item to one client.
  The remaining case: device A creates the task, its lease expires before its
  `addTask` reaches the server, and device B claims the same item. B's dedupe
  check only sees the task once A's op has synced, so both clients could
  create a task with the same id. A 24 h lease makes this rare. **M3 must
  reproduce it with an E2E and show the outcome converges to exactly one
  task.** If it doesn't, the fix is a longer lease or ack-on-upload, never a
  new conflict path.
- **Replays:** remote `addTask` ops never trigger the importer; it runs only
  from the local sync trigger.
- **Wire and public API:** new HTTP routes only. Older apps never call them;
  the new WebSocket message is ignored by them. The MCP tool contract
  (`add_task`, two fields) is public once shipped; adding optional fields
  later is compatible, removing one isn't.
- **Maintenance:** an OAuth server is the largest new surface. Keep it to the
  four endpoints above and CIMD only. Anthropic and OpenAI change connector
  rules often (both changed redirect or registration guidance in 2026), so
  the spec revision and redirect handling need a yearly check.

## 7. Milestones

| #   | Deliverable                                                                                                                                                                                               | Exit                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | **Connector spike** on a staging server: `/mcp` + `add_task` with a fixed static token, plaintext queue, `curl` to read the queue. No app work.                                                           | The tool is called from claude.ai web, the Claude mobile app and a Claude Code cloud session. Answers whether the static-header beta is enough for a first test.                              |
| M1  | **Server:** tables + migration, OAuth (PRM, AS metadata, CIMD fetch, authorize page, token, refresh rotation), `/mcp`, sealing, app endpoints, cleanup step, `CAPTURE_CONNECTOR_ENABLED`.                 | Vitest + pglite specs: sync JWT refused on `/mcp`, capture token refused on `/api/sync`, PKCE, `resource` mismatch, refresh reuse revokes, queue cap, claim lease, account deletion cascades. |
| M2  | **Client:** sealed-box helpers in `sync-core` (with Node ↔ WebCrypto interop test), provider methods, `SuperSyncCaptureSource`, trigger, settings fields, password-change re-wrap.                        | Unit tests for the source and the crypto; `npm run test:affected` passes.                                                                                                                     |
| M3  | **E2E** (`e2e:supersync`): call `/mcp` over HTTP → app syncs → exactly one Inbox task; retry after a lost ack; two clients and the lease-expiry race from §6; feature off deletes pending items.          | All pass with `--retries=0`. The race case converges to one task in both directions.                                                                                                          |
| M4  | **Docs and release:** wiki page with per-client setup (claude.ai, Claude Code, ChatGPT), privacy-policy addition (in-memory plaintext, encrypted queue), release notes, then enable on the hosted server. | Only clients verified end to end are named. Native capture plan's deferral line points here.                                                                                                  |

M0 needs a public https staging server. Everything after it can be split into
one server PR and one app PR, both behind the server flag.

## 8. Open questions for the maintainer

1. **Plaintext in memory.** OK that the hosted server sees capture text in
   memory before sealing it? (No connector can avoid it; stored data stays
   encrypted.)
2. **CIMD only?** Recommended. DCR would add a registration endpoint and a
   client table for clients that don't publish CIMD; add it only if a client
   we care about needs it.
3. **Fields.** Title and notes only, like native capture? A due date
   ("tomorrow") is the most likely follow-up ask; keep it out of v1.
4. **Self-hosting default.** Off by default for self-hosted servers, on for
   the hosted one?
5. **Relationship to #10251.** Land #10251 first and share its MCP protocol
   handler, or build this first? The hosted connector covers capture
   everywhere; #10251 still covers reading tasks and users without SuperSync.

## Sources

- SuperSync server: `server.ts`, `auth.ts`, `middleware.ts`, `sync/cleanup.ts`,
  `sync/sync.routes.payload.ts`, `prisma/schema.prisma` (checked 2026-10-11).
- App: `native-capture-importer.service.ts`, `ios-share.service.ts`,
  `sync-wrapper.service.ts`, `super-sync-websocket.service.ts`,
  `packages/sync-core/src/encryption.ts`; #10251's `AssistantCaptureService`.
- Claude connectors: https://claude.com/docs/connectors/building/authentication.md,
  https://claude.com/docs/connectors/custom/add-unlisted.md,
  https://code.claude.com/docs/en/mcp,
  https://platform.claude.com/docs/en/api/ip-addresses (checked 2026-10-11).
- MCP authorization 2025-11-25:
  https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization;
  2026-07-28 changelog (DCR deprecated in favour of CIMD).
- ChatGPT: https://developers.openai.com/api/docs/guides/custom-mcp-server
  (from search excerpts; not read directly). Write tools in custom MCP are a
  Business/Enterprise/Edu beta; Plus and mobile support unverified.
