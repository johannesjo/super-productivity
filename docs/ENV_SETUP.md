# Environment Configuration Setup

This project uses a hybrid approach for environment configuration:

- **Base configuration** (production/stage flags) are in static TypeScript files
- **Secrets and dynamic values** are loaded from `.env` files at build time

## Overview

### Static Environment Files

- `src/environments/environment.ts` - Development configuration
- `src/environments/environment.prod.ts` - Production configuration
- `src/environments/environment.stage.ts` - Staging configuration

These files contain base configuration like `production`, `stage`, and `version` flags.

### Dynamic Environment Variables

- `.env` - Environment variables for all environments

This file contains secrets and environment-specific values that should not be committed to version control.

## Setup Instructions

1. **Create your .env file**

   ```bash
   cp .env.example .env
   ```

2. **Add your environment variables**

   ```bash
   # .env
   GOOGLE_DRIVE_TOKEN=your-token-here
   DROPBOX_API_KEY=your-api-key-here
   ```

3. **Access environment variables in your code**

   ```typescript
   // Direct access (works everywhere)
   const googleToken = process.env.GOOGLE_DRIVE_TOKEN;

   // Or using utility functions
   import { getEnv, getEnvOrDefault } from './app/util/env';

   const googleToken = getEnv('GOOGLE_DRIVE_TOKEN');
   const dropboxKey = getEnvOrDefault('DROPBOX_API_KEY', 'default-key');
   ```

## Running the Application

The npm scripts automatically load the `.env` file:

```bash
# Development
npm run startFrontend

# Production configuration
npm run startFrontend:prod

# Staging configuration
npm run startFrontend:stage
```

Note: All commands use the same `.env` file. The difference between environments is controlled by the Angular configuration (production/stage flags).

## Build Commands

Build commands also load the appropriate environment:

```bash
# Production build
npm run buildFrontend:prod:es6

# Staging build
npm run buildFrontend:stage:es6
```

## How It Works

1. **dotenv-run** loads variables from `.env` file before running Angular commands
2. **webpack DefinePlugin** injects these variables as `process.env.*` at build time
3. **Pure utility functions** in `src/app/util/env.ts` provide helper functions (optional)
4. **TypeScript declarations** in `src/types/environment.d.ts` provide type safety

## Security Notes

- Never commit `.env` files to version control
- Secrets are injected at build time, not included in source code
- Access variables directly via `process.env` or use the utility functions
- Add new environment variables to both `.env.example` and `src/types/environment.d.ts`

## Adding New Environment Variables

1. Add to `.env.example` as documentation:

   ```bash
   NEW_API_KEY=your-api-key-here
   ```

2. Add TypeScript declaration in `src/types/environment.d.ts`:

   ```typescript
   interface ProcessEnv {
     NEW_API_KEY?: string;
     // ... other variables
   }
   ```

3. Use in your code:

   ```typescript
   // Direct access
   const apiKey = process.env.NEW_API_KEY;

   // Or with utility function
   import { getEnv } from './app/util/env';
   const apiKey = getEnv('NEW_API_KEY');
   ```
