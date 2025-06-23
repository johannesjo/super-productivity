# Sync.md Plugin Implementation Guide

## Overview

The Sync.md plugin has been completely rewritten using Solid.js with a sophisticated bidirectional sync algorithm. This implementation provides reliable, conflict-aware synchronization between markdown files and SuperProductivity projects.

## Architecture

### Frontend (Solid.js)

- **Modern reactive UI** built with Solid.js
- **TypeScript support** for type safety
- **Vite build system** for fast development and optimized production builds
- **CSS variables** for theme integration with SuperProductivity

### Backend (Plugin Logic)

- **Bidirectional sync engine** with conflict detection
- **Checksum-based change tracking** for reliable state management
- **Node.js file system integration** for markdown file operations
- **Event-driven updates** responding to task changes in SuperProductivity

## Sync Algorithm

### Core Concept

The bidirectional sync algorithm tracks changes on both sides (markdown file and SuperProductivity project) and intelligently merges them while detecting conflicts.

```typescript
interface SyncState {
  lastSyncTime: Date | null;
  fileChecksum: string | null;
  taskChecksums: Map<string, string>;
}
```

### Change Detection

1. **File Changes**: MD5-like checksum of entire file content
2. **Task Changes**: Individual checksums for each task based on title and completion status
3. **Sync History**: Maintains state from last successful sync to detect what changed

### Conflict Resolution

When both sides have changed the same task since the last sync:

```typescript
interface SyncConflict {
  taskId: string;
  taskTitle: string;
  fileValue: MarkdownTask;
  projectValue: Task;
  resolution?: 'file' | 'project' | 'skip';
}
```

Conflicts are returned to the user for manual resolution.

## Sync Directions

### 1. Bidirectional (Default)

- **When to use**: Collaborative workflows where both markdown and project can be modified
- **Behavior**: Merges changes from both sides, detects conflicts when both modify same task
- **Conflict handling**: Returns conflicts for user resolution

### 2. File → Project

- **When to use**: Markdown file is the authoritative source
- **Behavior**: Updates project to match markdown file exactly
- **Use case**: Personal planning workflow where markdown is primary

### 3. Project → File

- **When to use**: SuperProductivity project is authoritative
- **Behavior**: Updates markdown file to match project state
- **Use case**: Team collaboration where project is managed in SuperProductivity

## Implementation Details

### Task Identification

Tasks are identified using normalized title-based keys to handle renames and hierarchy:

```typescript
private generateTaskKey(title: string, parentKey: string): string {
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  return parentKey ? `${parentKey}::${normalizedTitle}` : normalizedTitle;
}
```

### Hierarchy Support

The algorithm correctly handles nested tasks:

```markdown
- [ ] Main task
  - [x] Subtask 1
  - [ ] Subtask 2
    - [x] Sub-subtask
```

### Checksum Algorithm

Simple but effective hash function for change detection:

```typescript
private simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
```

## User Interface

### Configuration

- **File Path**: Path to markdown file for syncing
- **Project Selection**: Choose which SuperProductivity project to sync with
- **Sync Direction**: Configure sync behavior
- **Real-time Status**: Shows sync state and last sync time

### Features

- **Test Connection**: Validate file access before setting up sync
- **Manual Sync**: Trigger sync on demand
- **Conflict Display**: Visual representation of conflicts with resolution options
- **File Preview**: Show content of markdown file during setup

## Testing

### Unit Tests

Run the sync logic tests:

```bash
npx tsx test-sync-logic.ts
```

### Integration Examples

Comprehensive scenarios demonstrating real-world usage:

```bash
npx tsx sync-example.ts
```

### Test Scenarios

1. **No Conflicts**: Simple bidirectional sync with changes on both sides
2. **With Conflicts**: Same task modified differently on both sides
3. **Hierarchical**: Complex nested task structures
4. **Direction Comparison**: Behavior differences between sync modes
5. **Real-world**: Developer + team collaboration scenario

## Development

### Build Process

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Package as plugin
npm run package
```

### File Structure

```
sync-md/
├── src/
│   ├── App.tsx           # Main Solid.js component
│   ├── syncLogic.ts      # Core bidirectional sync algorithm
│   ├── types.ts          # TypeScript interfaces
│   ├── pluginApi.ts      # SuperProductivity API wrapper
│   ├── styles.css        # UI styles
│   └── index.tsx         # Entry point
├── plugin.js             # Plugin integration with SuperProductivity
├── manifest.json         # Plugin metadata
├── index.html            # HTML template
└── vite.config.ts        # Build configuration
```

## Performance Considerations

### Efficient Operations

- **Incremental sync**: Only processes changed tasks
- **Debounced updates**: Prevents excessive sync operations
- **Memory-efficient**: Uses Maps for O(1) task lookups
- **Lazy loading**: Initializes sync engine only when needed

### Scalability

- **Large files**: Handles markdown files with hundreds of tasks
- **Deep hierarchy**: Supports arbitrary nesting levels
- **Fast parsing**: Efficient regex-based markdown parsing
- **Minimal memory**: Cleanup of sync state after operations

## Security

### File Access

- **Sandboxed**: File operations use SuperProductivity's `executeNodeScript`
- **Path validation**: Prevents directory traversal attacks
- **Error handling**: Graceful handling of permission issues
- **Timeout protection**: Prevents hanging operations

### Data Integrity

- **Atomic operations**: Sync operations are all-or-nothing
- **Backup strategy**: Original data preserved on conflicts
- **Checksum validation**: Ensures data consistency
- **State recovery**: Can recover from interrupted syncs

## Migration from Original Plugin

The new implementation is backward compatible:

1. **Configuration preserved**: Existing settings are migrated automatically
2. **API compatibility**: Same interface for SuperProductivity integration
3. **Enhanced features**: All original functionality plus bidirectional sync
4. **Performance improved**: Faster UI and more reliable sync operations

## Future Enhancements

### Planned Features

1. **Conflict resolution UI**: Visual conflict resolution interface
2. **Sync scheduling**: Automatic sync at configurable intervals
3. **Multiple files**: Support for syncing multiple markdown files
4. **Sync history**: Track and display sync operation history
5. **Custom parsing**: Configurable markdown format support

### Extensibility

The modular architecture supports easy extension:

- **Custom sync strategies**: Pluggable sync algorithms
- **Additional file formats**: Support for other text formats
- **Advanced conflict resolution**: Automated resolution strategies
- **Integration hooks**: Event system for custom behaviors

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure file is readable/writable
2. **Sync conflicts**: Review conflicting changes and choose resolution
3. **Plugin not loading**: Check SuperProductivity plugin permissions
4. **File not found**: Verify file path is correct and accessible

### Debug Information

The plugin logs detailed information for troubleshooting:

```javascript
console.log('[Sync.md] Plugin initializing...');
console.log('[Sync.md] Sync completed:', syncResult);
console.log('[Sync.md] Conflicts detected:', conflicts);
```

### Support

For issues and feature requests:

1. Check the test suite for expected behavior
2. Review sync examples for usage patterns
3. Examine console logs for error details
4. Test with minimal markdown files to isolate issues
