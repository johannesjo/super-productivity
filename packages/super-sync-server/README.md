# SuperSync Server

A custom, high-performance synchronization server for Super Productivity.

> **Note:** This server implements a custom operation-based synchronization protocol (Event Sourcing), **not** WebDAV. It is designed specifically for the Super Productivity client's efficient sync requirements.

## Architecture

The server uses an **Append-Only Log** architecture backed by **SQLite**:

1.  **Operations**: Clients upload atomic operations (Create, Update, Delete, Move).
2.  **Sequence Numbers**: The server assigns a strictly increasing `server_seq` to each operation.
3.  **Synchronization**: Clients request "all operations since sequence `X`".
4.  **Snapshots**: The server can regenerate the full state by replaying operations, optimizing initial syncs.

## Quick Start

```bash
# Install dependencies
npm install

# Set JWT secret (required in production)
export JWT_SECRET="your-secure-random-secret"

# Start the server
npm run dev

# Or build and run
npm run build
npm start
```

## Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env` and customize:

| Variable       | Default  | Description                                         |
| -------------- | -------- | --------------------------------------------------- |
| `PORT`         | `1900`   | Server port                                         |
| `DATA_DIR`     | `./data` | Directory for storing sync data (SQLite DB)         |
| `PUBLIC_URL`   | -        | Publicly reachable URL used for email links         |
| `JWT_SECRET`   | -        | **Required in production.** Secret for signing JWTs |
| `CORS_ENABLED` | `true`   | Enable CORS for browser clients                     |
| `CORS_ORIGINS` | `*`      | Allowed origins (comma-separated)                   |
| `NODE_ENV`     | -        | Set to `production` for production mode             |

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

- **Base URL**: `http://localhost:1900` (or your deployed URL)
- **Auth Token**: JWT token from login

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Docker

```bash
docker run -d \
  -p 1900:1900 \
  -e JWT_SECRET="your-secure-secret" \
  -e NODE_ENV="production" \
  -v ./data:/app/data \
  super-productivity/sync-server
```

## Security Notes

- **Set JWT_SECRET** to a secure random value in production.
- **Use HTTPS in production** (via reverse proxy like nginx).
- **Restrict CORS origins** in production.
