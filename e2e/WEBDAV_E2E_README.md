# WebDAV E2E Testing

## Quick Start

```bash
# Run WebDAV e2e tests with Docker
npm run e2e:webdav
```

## What it tests

- WebDAV configuration setup
- Basic sync functionality with Last-Modified fallback
- Both ETag and Last-Modified header support

## Manual testing

1. Start the WebDAV server:

   ```bash
   docker-compose -f docker-compose.webdav-e2e.yaml up -d
   ```

2. Run the e2e tests:

   ```bash
   npm run e2e:tag webdav
   ```

3. Stop the server:
   ```bash
   docker-compose -f docker-compose.webdav-e2e.yaml down
   ```

## Mock Server Details

- URL: http://localhost:8080
- Credentials: test/testpass
- Features: ETag, Last-Modified, conditional headers
- Storage: In-memory (resets on restart)

Keep it simple!
