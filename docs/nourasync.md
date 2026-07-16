# NouraSync architecture

NouraSync is the optional network boundary for Noura. The client remains local-first and sends encrypted operation payloads through the shared Zod HTTP contract.

- **Runtime:** Bun 1.3.14
- **HTTP:** Hono
- **Database:** PostgreSQL 16 through Drizzle and `drizzle-orm/bun-sql`
- **Authentication:** magic links, passkeys, recovery flows, and JWT bearer tokens
- **Email:** Nodemailer with configurable SMTP
- **Realtime:** lightweight WebSocket notifications; clients fetch operations over HTTP
- **Hosting:** one Railway replica or one Docker Compose service

The service deliberately has no plugin platform, no alternate database, and no legacy database migration path. In-memory coordination requires a single replica.
