# Sync.md Plugin (Solid.js Version)

A SuperProductivity plugin that syncs markdown files with project tasks, now built with Solid.js for better performance and maintainability.

## Features

- **Bidirectional Sync**: Sync changes from markdown to project and vice versa
- **One-way Sync Options**: Choose to sync only from file to project or project to file
- **Conflict Detection**: Detects when both file and project have changed
- **Real-time Monitoring**: Watches markdown files for changes
- **Modern UI**: Built with Solid.js for a responsive, reactive interface

## Sync Logic

The plugin uses a sophisticated bidirectional sync algorithm that:

1. **Tracks Changes**: Maintains checksums of tasks and file content to detect changes
2. **Detects Conflicts**: Identifies when both sides have modified the same task
3. **Preserves Hierarchy**: Maintains task/subtask relationships during sync
4. **Handles Deletions**: Marks tasks for deletion rather than removing them

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Package as plugin
npm run package
```

## Testing Sync Logic

```bash
# Run sync logic tests
npx tsx test-sync-logic.ts
```

## Architecture

- `src/App.tsx` - Main Solid.js application component
- `src/syncLogic.ts` - Core bidirectional sync algorithm
- `plugin.js` - Plugin entry point that integrates with SuperProductivity
- `index.html` - HTML template for the plugin UI

## Sync Directions

- **Bidirectional**: Changes sync both ways with conflict detection
- **File → Project**: Markdown file is the source of truth
- **Project → File**: SuperProductivity project is the source of truth
