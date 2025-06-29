# Super Productivity Packages

This directory contains plugin packages and the plugin API for Super Productivity.

## Structure

- `plugin-api/` - TypeScript definitions for the plugin API
- `plugin-dev/` - Plugin development examples and tools
  - `api-test-plugin/` - Basic API test plugin
  - `procrastination-buster/` - Example SolidJS-based plugin
  - `yesterday-tasks-plugin/` - Simple plugin showing yesterday's tasks
  - `boilerplate-solid-js/` - Template for creating new SolidJS plugins (not built)
  - `sync-md/` - Markdown sync plugin (not built)

## Building Packages

All packages are built automatically when running the main build process:

```bash
npm run build:packages
```

This command:

1. Builds the plugin-api TypeScript definitions
2. Builds plugins that require compilation (e.g., procrastination-buster)
3. Copies plugin files to `src/assets/` for inclusion in the app

## Development

To work on a specific plugin:

```bash
cd plugin-dev/[plugin-name]
npm install
npm run dev
```

## Adding a New Plugin

1. Create a new directory in `plugin-dev/`
2. Add the plugin configuration to `/packages/build-packages.js`
3. Run `npm run build:packages` to test the build

## Notes

- The `boilerplate-solid-js` and `sync-md` plugins are development templates and are not included in production builds
- Plugin files are automatically copied to `src/assets/` during the build process
- The build script handles dependency installation automatically
