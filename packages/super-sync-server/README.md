# SuperSync Server

A WebDAV-based sync server for Super Productivity.

## Quick Start

```bash
# Install dependencies
npm install

# Set up users (required)
export USERS="admin:yourpassword"

# Start the server
npm run dev

# Or build and run
npm run build
npm start
```

## Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env` and customize:

| Variable       | Default  | Description                                       |
| -------------- | -------- | ------------------------------------------------- |
| `PORT`         | `1900`   | Server port                                       |
| `DATA_DIR`     | `./data` | Directory for storing sync data                   |
| `USERS`        | -        | **Required.** User credentials (see format below) |
| `CORS_ENABLED` | `true`   | Enable CORS for browser clients                   |
| `CORS_ORIGINS` | `*`      | Allowed origins (comma-separated)                 |

### User Format

```
USERS="username:password,username2:password2:admin"
```

- Format: `username:password` or `username:password:admin`
- Multiple users separated by commas
- Add `:admin` suffix for admin privileges
- At least one user is required for the server to accept connections

## Client Configuration

In Super Productivity, configure SuperSync with:

- **Base URL**: `http://localhost:1900/`
- **Username**: Your configured username
- **Password**: Your configured password
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
  -e USERS="admin:secret" \
  -v ./data:/app/data \
  super-productivity/sync-server
```

## Security Notes

- **Never use default passwords in production**
- **Use HTTPS in production** (via reverse proxy like nginx)
- **Restrict CORS origins** in production: `CORS_ORIGINS="https://app.super-productivity.com"`
