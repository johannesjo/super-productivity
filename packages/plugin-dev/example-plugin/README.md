# Example Super Productivity Plugin

This is a complete example plugin demonstrating TypeScript development for Super Productivity.

## Features

- ✅ Full TypeScript support with type safety
- ✅ Task completion tracking
- ✅ Statistics dashboard (iframe UI)
- ✅ Keyboard shortcuts
- ✅ State persistence
- ✅ Dialog integration
- ✅ All API methods demonstrated

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the plugin:

   ```bash
   npm run build
   ```

3. Package for distribution:
   ```bash
   npm run package
   ```

## Development

Watch for changes during development:

```bash
npm run dev
```

Install to local Super Productivity for testing:

```bash
npm run install-local
```

## What This Plugin Does

1. **Tracks Task Completions**: Counts how many tasks you complete in a session
2. **Shows Statistics**: Displays task statistics via keyboard shortcut
3. **Provides Dashboard**: iframe UI showing plugin data
4. **Demonstrates API**: Uses all major PluginAPI features

## Code Structure

- `src/index.ts` - Main plugin logic with TypeScript
- `assets/index.html` - Dashboard UI for the plugin
- `manifest.json` - Plugin metadata and permissions
- `webpack.config.js` - Build configuration

## Key Concepts Demonstrated

### State Management

```typescript
// Save plugin state
await PluginAPI.persistDataSynced(JSON.stringify(state));

// Load plugin state
const savedData = await PluginAPI.loadSyncedData();
```

### Hook Registration

```typescript
PluginAPI.registerHook('taskComplete', async (task) => {
  // Handle task completion
});
```

### UI Integration

```typescript
PluginAPI.registerShortcut({
  id: 'show_stats',
  label: 'Show Task Statistics',
  onExec: async () => {
    // Show statistics dialog
  },
});
```

### iframe Communication

```typescript
PluginAPI.onMessage(async (message) => {
  // Handle messages from iframe
  return response;
});
```

## Building Your Own Plugin

Use this as a template:

1. Copy this directory
2. Update `manifest.json` with your plugin details
3. Modify `src/index.ts` with your logic
4. Customize `assets/index.html` for your UI
5. Build and test!

## License

MIT
