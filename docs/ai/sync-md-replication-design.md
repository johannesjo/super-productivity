# Sync-MD Plugin Replication Design

## Overview

The sync-md plugin provides bidirectional synchronization between SuperProductivity tasks and Markdown checklist files (e.g., in Obsidian). This document outlines design considerations and recommendations for efficient, data-preserving replication.

## Current Architecture Analysis

### Data Models

**SuperProductivity Task**:

- Complex data structure with ~30+ fields
- Supports hierarchical relationships (parent/child)
- Includes metadata: timeSpent, attachments, reminders, tags, etc.
- Uses NgRx for state management

**Markdown Representation**:

- Simple checkbox format: `- [ ] Task title`
- Hierarchical through indentation
- Limited metadata support (only title, completion status, hierarchy)
- Optional ID embedding: `- [ ] (task-id) Task title`

### Current Sync Logic

The `syncLogic.ts` implements:

1. Tree-based comparison algorithm
2. Bidirectional sync with three modes: `fileToProject`, `projectToFile`, `bidirectional`
3. Operations: add, update, delete
4. Simple checksum-based change detection

## Key Challenges

### 1. Data Loss Prevention

**Problem**: Markdown can only represent a subset of task data (title, isDone, hierarchy). Other fields like timeSpent, attachments, reminders cannot be synced.

**Current Behavior**: Non-representable data is preserved in SuperProductivity but lost if task is deleted and recreated from markdown.

### 2. Efficient Updates

**Problem**: Current implementation may trigger unnecessary updates or lose task metadata during sync operations.

### 3. Conflict Resolution

**Problem**: When both markdown and SuperProductivity change, determining the "correct" state is complex.

## Proposed Solution: Dedicated Sync API

### 1. New API Endpoint: `updateTasksForProject`

Create a specialized API in SuperProductivity that handles bulk task updates while preserving metadata:

```typescript
interface SyncTaskUpdate {
  id?: string; // Existing task ID (if updating)
  tempId?: string; // Temporary ID for new tasks
  title: string;
  isDone: boolean;
  parentId?: string | null;
  order: number; // Position in list
  syncMetadata?: {
    markdownLine?: number;
    lastSyncChecksum?: string;
  };
}

interface UpdateTasksForProjectRequest {
  projectId: string;
  tasks: SyncTaskUpdate[];
  syncMode: 'merge' | 'replace';
  preserveFields?: string[]; // Fields to never overwrite
}

interface UpdateTasksForProjectResponse {
  success: boolean;
  taskIdMapping: { [tempId: string]: string }; // Maps temp IDs to real IDs
  conflicts: SyncConflict[];
  stats: {
    created: number;
    updated: number;
    deleted: number;
    preserved: number;
  };
}
```

### 2. Implementation Strategy

#### A. Merge Mode (Recommended Default)

- Updates only specified fields (title, isDone, hierarchy)
- Preserves all other task data (timeSpent, attachments, etc.)
- Handles reordering efficiently
- Minimal data loss risk

#### B. Replace Mode (Optional)

- Replaces entire task list for project
- Useful for "source of truth" scenarios
- Higher risk of data loss

### 3. Enhanced Sync Logic

```typescript
class EnhancedSyncLogic {
  async syncWithProject(
    markdownContent: string,
    projectId: string,
    direction: SyncDirection,
  ): Promise<SyncResult> {
    // 1. Parse markdown to structured format
    const markdownTasks = this.parseMarkdownToStructuredTasks(markdownContent);

    // 2. Fetch current project state
    const projectTasks = await this.api.getProjectTasks(projectId);

    // 3. Build sync plan
    const syncPlan = this.buildSyncPlan(markdownTasks, projectTasks, direction);

    // 4. Execute sync based on direction
    if (direction === 'fileToProject' || direction === 'bidirectional') {
      // Use new API to update tasks efficiently
      const updateRequest: UpdateTasksForProjectRequest = {
        projectId,
        tasks: syncPlan.tasksToUpdate,
        syncMode: 'merge',
        preserveFields: ['timeSpent', 'attachments', 'reminders', 'tags'],
      };

      const response = await this.api.updateTasksForProject(updateRequest);

      // Update markdown with new IDs if needed
      if (response.taskIdMapping) {
        markdownContent = this.updateMarkdownWithIds(
          markdownContent,
          response.taskIdMapping,
        );
      }
    }

    // 5. Handle projectToFile updates
    if (direction === 'projectToFile' || direction === 'bidirectional') {
      markdownContent = this.generateMarkdownFromTasks(projectTasks);
    }

    return {
      updatedMarkdown: markdownContent,
      stats: syncPlan.stats,
      conflicts: syncPlan.conflicts,
    };
  }
}
```

### 4. Conflict Resolution Strategy

1. **Last Write Wins with Metadata Preservation**
   - For title/isDone conflicts: Use most recent change
   - Always preserve SuperProductivity-only fields
2. **Smart Merge**
   - If only one side changed: Apply that change
   - If both changed differently: Create conflict entry
3. **User-Defined Rules**
   - Allow configuration of field priorities
   - Option to always prefer markdown or always prefer SuperProductivity

### 5. Performance Optimizations

1. **Batch Operations**
   - Single API call for all updates
   - Reduced state mutations in NgRx
2. **Incremental Sync**
   - Track checksums per task
   - Only sync changed tasks
3. **Efficient Tree Comparison**
   - Use Map for O(1) lookups
   - Minimize tree traversals

## Implementation Recommendations

### Phase 1: API Development

1. Create `updateTasksForProject` action in NgRx
2. Implement batch update logic in task reducer
3. Add API endpoint in task service
4. Ensure proper transaction handling

### Phase 2: Plugin Enhancement

1. Update sync logic to use new API
2. Implement improved conflict detection
3. Add checksum tracking per task
4. Enhance error handling and recovery

### Phase 3: Advanced Features

1. Selective field sync configuration
2. Conflict resolution UI
3. Sync history/undo capability
4. Performance monitoring

## Benefits

1. **Data Integrity**: Preserves all SuperProductivity task metadata
2. **Performance**: Reduces unnecessary updates and API calls
3. **Flexibility**: Supports different sync strategies
4. **Reliability**: Better conflict handling and error recovery
5. **Extensibility**: Easy to add new sync features

## Alternative Approaches Considered

1. **Full Task Serialization in Markdown**
   - Pros: No data loss
   - Cons: Breaks markdown readability, complex parsing
2. **Shadow Database**
   - Pros: Complete sync state tracking
   - Cons: Complex implementation, storage overhead
3. **Event Sourcing**
   - Pros: Perfect conflict resolution
   - Cons: Major architecture change

## Conclusion

The proposed `updateTasksForProject` API provides the best balance of:

- Data preservation
- Implementation simplicity
- Performance
- User experience

This approach minimizes data loss while maintaining the simplicity of markdown files for external editing.
