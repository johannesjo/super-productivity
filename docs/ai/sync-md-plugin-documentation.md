# Sync-MD Plugin Documentation

## Overview

The Sync-MD plugin enables bidirectional synchronization between markdown files and SuperProductivity projects. It allows users to manage tasks in their preferred markdown editor while keeping them synchronized with SuperProductivity.

## Current Architecture (v2.0.0)

### Core Components

1. **FileWatcherBatch** (`src/fileWatcherBatch.ts`)

   - Main synchronization class using the batch API
   - Implements 10-second debouncing for all sync operations
   - Handles bidirectional sync with conflict resolution
   - Uses dependency injection for testability

2. **Background Script** (`src/background.ts`)

   - Manages plugin lifecycle and message handling
   - Implements SP hooks for real-time sync triggers
   - Auto-starts from saved configuration
   - Handles all communication with the UI

3. **Utility Modules** (`src/utils/`)
   - `markdown-parser.ts` - Parse markdown tasks and generate IDs
   - `batch-operations.ts` - Build batch operations for the SP API
   - `debouncer.ts` - Reusable debouncing utility
   - `file-operations.ts` - Abstracted file operations with mock support

### Key Features

#### Task Identification

- Tasks are linked using HTML comments: `<!-- sp:unique-id -->`
- IDs are generated with format: `md-timestamp-random`
- IDs are written to markdown files after a 10-second delay to prevent editing interference

#### Synchronization Logic

**File to Project (Markdown → SP)**

1. Parse markdown file to extract tasks
2. Match tasks with existing SP tasks using IDs
3. Build batch operations:
   - Create: New tasks without IDs
   - Update: Existing tasks with changes
   - Delete: SP tasks not in markdown
4. Execute batch update via SP API
5. Queue ID updates for new tasks (10-second delay)

**Project to File (SP → Markdown)**

1. Fetch all tasks from SP project
2. Generate markdown representation
3. Preserve task hierarchy (parent-child relationships)
4. Write complete file (with 2-second delay)

#### Debouncing Strategy

- File changes: 10-second debounce before sync
- SP hooks (task updates): 10-second debounce
- ID writing: 10-second delay after task creation
- Prevents conflicts during active editing

### Configuration

```typescript
interface SyncConfig {
  enabled?: boolean;
  projectId: string;
  filePath: string;
  syncDirection: 'fileToProject' | 'projectToFile' | 'bidirectional';
}
```

### Build System

The plugin uses a streamlined build process:

1. **Main Build** (`scripts/build-proper.js`)

   - Builds UI with Vite
   - Bundles background script with Rollup
   - Copies assets and manifest

2. **Packaging** (`scripts/build-plugin.js`)

   - Creates distributable ZIP file
   - Includes all necessary files
   - Maintains proper structure

3. **Development** (`scripts/watch-and-build.js`)
   - Watches for changes
   - Auto-rebuilds plugin
   - Supports hot reload

### Testing

Comprehensive test suite using Jest:

- Unit tests for all utility modules
- Integration tests for FileWatcherBatch
- Message handling tests for background script
- Mock implementations for plugin API

### Error Handling

- Graceful degradation when file operations fail
- User-friendly error messages via snackbar notifications
- Comprehensive logging for debugging
- Automatic retry for transient failures

## Usage

1. **Installation**

   - Build: `npm run build`
   - Package: `npm run package`
   - Install ZIP file in SuperProductivity

2. **Configuration**

   - Select project to sync
   - Choose markdown file path
   - Set sync direction
   - Enable sync

3. **Markdown Format**
   ```markdown
   - [ ] Parent task
     - [x] Completed subtask
     - [ ] Pending subtask
   ```

## Technical Details

### Batch API Integration

The plugin uses SuperProductivity's batch API for efficient updates:

- Reduces API calls
- Maintains consistency
- Supports bulk operations
- Handles temp ID resolution

### State Management

- No persistent state in plugin
- IDs stored in markdown as HTML comments
- Configuration saved via SP's plugin API
- Sync status available on demand

### Performance Considerations

- Debouncing prevents excessive syncs
- Batch operations reduce overhead
- File watching uses native fs module
- Minimal memory footprint

## Migration from Previous Versions

### From v1.x to v2.0

- New batch API replaces individual task updates
- Improved debouncing (300ms → 10s)
- Better error handling and recovery
- Simplified codebase with utility modules

### Breaking Changes

- Removed individual task update methods
- Changed ID format (but backward compatible)
- Updated configuration structure
- New build system

## Troubleshooting

### Common Issues

1. **Tasks not syncing**

   - Check file permissions
   - Verify project selection
   - Ensure sync is enabled
   - Check console for errors

2. **Duplicate tasks**

   - Run cleanup sync
   - Check for ID conflicts
   - Verify sync direction

3. **Performance issues**
   - Large files may need optimization
   - Consider splitting into smaller files
   - Check for circular references

### Debug Mode

Enable verbose logging in browser console:

```javascript
localStorage.setItem('debug', 'sync-md:*');
```

## Future Enhancements

- [ ] Support for task properties (due dates, tags)
- [ ] Bulk operations UI
- [ ] Sync status indicators
- [ ] Conflict resolution UI
- [ ] Multiple file support
- [ ] Custom ID formats

## Contributing

See main SuperProductivity contributing guidelines. Key points:

- Follow existing code style
- Add tests for new features
- Update documentation
- Test with real markdown files

## License

Same as SuperProductivity - MIT License
