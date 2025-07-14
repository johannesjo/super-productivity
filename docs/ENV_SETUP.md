# Environment Configuration

Super Productivity now uses `.env` files for environment-specific configuration instead of Angular's traditional environment files.

## Setup

1. Copy `.env.example` to `.env` for local development:

   ```bash
   cp .env.example .env
   ```

2. Create environment-specific files as needed:
   - `.env` - Default development environment
   - `.env.production` - Production environment
   - `.env.stage` - Staging environment

## How it Works

The build process automatically generates `src/environments/environment.ts` from the appropriate `.env` file using `tools/generate-env.js`.

## Available Variables

- `NODE_ENV` - Environment name (development, production, staging)
- `PRODUCTION` - Set to "true" for production builds
- `STAGE` - Set to "true" for staging builds

## Usage

### Development

```bash
npm run startFrontend
```

### Production

```bash
npm run startFrontend:prod
# or
npm run buildFrontend:prod:es6
```

### Staging

```bash
npm run startFrontend:stage
# or
npm run buildFrontend:stage:es6
```

## Adding New Environment Variables

1. Add the variable to your `.env` files
2. Update `tools/generate-env.js` to include the new variable in the generated environment
3. Use the variable in your code via `environment.yourVariable`

## Important Notes

- The `src/environments/environment.ts` file is auto-generated and should not be edited directly
- All `.env` files are gitignored for security
- Always use `.env.example` as a template for required variables
