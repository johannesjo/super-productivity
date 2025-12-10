# SuperSync Server

A custom, high-performance synchronization server for Super Productivity.

> **Note:** This server implements a custom operation-based synchronization protocol (Event Sourcing), **not** WebDAV. It is designed specifically for the Super Productivity client's efficient sync requirements.

## Architecture

The server uses an **Append-Only Log** architecture backed by **PostgreSQL** (via Prisma):

1.  **Operations**: Clients upload atomic operations (Create, Update, Delete, Move).
2.  **Sequence Numbers**: The server assigns a strictly increasing `server_seq` to each operation.
3.  **Synchronization**: Clients request "all operations since sequence `X`".
4.  **Snapshots**: The server can regenerate the full state by replaying operations, optimizing initial syncs.

## Quick Start

### Docker (Recommended)

The easiest way to run the server is using the provided Docker Compose configuration.

```bash
# 1. Copy environment example
cp .env.example .env

# 2. Configure .env (Set JWT_SECRET, DOMAIN, POSTGRES_PASSWORD)
nano .env

# 3. Start the stack (Server + Postgres + Caddy)
docker-compose up -d
```

### Manual Setup (Development)

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Set up .env
cp .env.example .env
# Edit .env to point to your PostgreSQL instance (DATABASE_URL)

# Push schema to DB
npx prisma db push

# Start the server
npm run dev

# Or build and run
npm run build
npm start
```

## Configuration

All configuration is done via environment variables.

| Variable       | Default                              | Description                                                                    |
| :------------- | :----------------------------------- | :----------------------------------------------------------------------------- |
| `PORT`         | `1900`                               | Server port                                                                    |
| `DATABASE_URL` | -                                    | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/db`) |
| `JWT_SECRET`   | -                                    | **Required.** Secret for signing JWTs (min 32 chars)                           |
| `PUBLIC_URL`   | -                                    | Public URL used for email links (e.g. `https://sync.example.com`)              |
| `CORS_ORIGINS` | `https://app.super-productivity.com` | Allowed CORS origins                                                           |
| `SMTP_HOST`    | -                                    | SMTP Server for emails                                                         |

## API Endpoints

### Authentication

#### Register a new user

```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Response:

```json
{
  "message": "User registered. Please verify your email.",
  "id": 1,
  "email": "user@example.com"
}
```

#### Login

```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": { "id": 1, "email": "user@example.com" }
}
```

### Synchronization

All sync endpoints require Bearer authentication: `Authorization: Bearer <jwt-token>`

#### 1. Upload Operations

Send new changes to the server.

```http
POST /api/sync/ops
```

#### 2. Download Operations

Get changes from other devices.

```http
GET /api/sync/ops?sinceSeq=123
```

#### 3. Get Snapshot

Get the full current state (optimized).

```http
GET /api/sync/snapshot
```

#### 4. Sync Status

Check pending operations and device status.

```http
GET /api/sync/status
```

## Client Configuration

In Super Productivity, configure the Custom Sync provider with:

- **Base URL**: `https://sync.your-domain.com` (or your deployed URL)
- **Auth Token**: JWT token from login

## Maintenance

### Scripts

The server includes scripts for administrative tasks. These use the configured database.

```bash
# Delete a user account
npm run delete-user -- user@example.com

# Clear sync data (preserves account)
npm run clear-data -- user@example.com

# Clear ALL sync data (dangerous)
npm run clear-data -- --all
```

## Security Notes

- **Set JWT_SECRET** to a secure random value in production.
- **Use HTTPS in production**. The Docker setup includes Caddy to handle this automatically.
- **Restrict CORS origins** in production.
