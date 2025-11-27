# SuperSync Server

A WebDAV-based sync server for Super Productivity with JWT authentication.

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
| `DATA_DIR`     | `./data` | Directory for storing sync data                     |
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

#### Verify email

```http
POST /api/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-registration"
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
  "token": "jwt-token-for-webdav",
  "user": { "id": 1, "email": "user@example.com" }
}
```

### WebDAV

All WebDAV endpoints require Bearer authentication:

```http
Authorization: Bearer <jwt-token>
```

Standard WebDAV methods are supported: `GET`, `PUT`, `DELETE`, `PROPFIND`, `PROPPATCH`, `MKCOL`, `COPY`, `MOVE`, `LOCK`, `UNLOCK`.

## Client Configuration

In Super Productivity, configure SuperSync with:

- **Base URL**: `http://localhost:1900/`
- **Auth Token**: JWT token from login response
- **Sync Folder**: `super-productivity` (or any folder name)

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Docker (Coming Soon)

```bash
docker run -d \
  -p 1900:1900 \
  -e JWT_SECRET="your-secure-secret" \
  -e NODE_ENV="production" \
  -v ./data:/app/data \
  super-productivity/sync-server
```

## Security Notes

- **Set JWT_SECRET** to a secure random value in production
- **Use HTTPS in production** (via reverse proxy like nginx)
- **Restrict CORS origins** in production: `CORS_ORIGINS="https://app.super-productivity.com"`
- Password must be at least 8 characters
