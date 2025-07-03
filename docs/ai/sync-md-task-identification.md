# Task Identification Strategies for Markdown Sync

## The Challenge

Markdown files don't have a native way to store unique identifiers for tasks. We need a reliable method to track which markdown task corresponds to which SuperProductivity task across sync operations.

## Approach 1: Embedded IDs (Current Implementation)

### Format

```markdown
- [ ] (task-123) Fix login bug
  - [x] (task-124) Debug issue
  - [ ] (task-125) Write tests
```

### Pros

- Explicit 1:1 mapping
- Survives any text changes
- No ambiguity

### Cons

- Clutters the markdown
- Not user-friendly for manual editing
- IDs might be accidentally deleted

### Implementation

```typescript
// Parsing
const idMatch = text.match(/^\(([^)]+)\)\s*(.+)$/);
const id = idMatch ? idMatch[1] : undefined;
const title = idMatch ? idMatch[2] : text;

// Generating
const line = includeIds
  ? `- [${isDone ? 'x' : ' '}] (${id}) ${title}`
  : `- [${isDone ? 'x' : ' '}] ${title}`;
```

## Approach 2: Hidden Metadata Comments

### Format

```markdown
- [ ] Fix login bug <!-- sp:task-123 -->
  - [x] Debug issue <!-- sp:task-124 -->
  - [ ] Write tests <!-- sp:task-125 -->
```

### Pros

- IDs hidden in rendered view
- Preserves clean appearance
- Standard HTML comment syntax

### Cons

- Some markdown editors strip comments
- Still visible in source
- Can be accidentally deleted

## Approach 3: Position + Content Hashing

### Format

```markdown
- [ ] Fix login bug
  - [x] Debug issue
  - [ ] Write tests
```

### Algorithm

```typescript
function generateTaskHash(task: MarkdownTask, parentHash?: string): string {
  const content = `${task.title}|${task.indentLevel}|${parentHash || 'root'}`;
  return simpleHash(content);
}

// Track mappings in sync state
interface SyncState {
  hashToIdMap: { [hash: string]: string };
  idToHashMap: { [id: string]: string };
  lastSyncSnapshot: MarkdownTask[];
}
```

### Pros

- Completely clean markdown
- No visible IDs
- Natural editing experience

### Cons

- Breaks if title changes
- Requires state persistence
- Complex conflict resolution

## Approach 4: Metadata File (Recommended)

### Format

**tasks.md:**

```markdown
- [ ] Fix login bug
  - [x] Debug issue
  - [ ] Write tests
```

**tasks.md.meta.json:** (hidden file)

```json
{
  "version": 1,
  "lastSync": "2024-01-03T10:00:00Z",
  "mappings": [
    {
      "line": 1,
      "text": "Fix login bug",
      "id": "task-123",
      "hash": "a1b2c3",
      "path": []
    },
    {
      "line": 2,
      "text": "Debug issue",
      "id": "task-124",
      "hash": "d4e5f6",
      "path": [0]
    },
    {
      "line": 3,
      "text": "Write tests",
      "id": "task-125",
      "hash": "g7h8i9",
      "path": [0]
    }
  ]
}
```

### Pros

- Completely clean markdown
- Robust tracking
- Supports additional metadata
- Can recover from conflicts

### Cons

- Requires managing separate file
- Can get out of sync
- More complex implementation

### Implementation

```typescript
class TaskIdentityTracker {
  private metaFilePath: string;
  private metadata: SyncMetadata;

  async syncTasks(markdownContent: string, tasks: Task[]): Promise<SyncResult> {
    // 1. Load metadata
    this.metadata = await this.loadMetadata();

    // 2. Parse current markdown
    const markdownTasks = this.parseMarkdown(markdownContent);

    // 3. Match tasks using multiple strategies
    const matches = this.matchTasks(markdownTasks, this.metadata);

    // 4. Update mappings
    this.updateMappings(matches, markdownTasks);

    // 5. Save metadata
    await this.saveMetadata();
  }

  private matchTasks(markdownTasks: MarkdownTask[], metadata: SyncMetadata): TaskMatch[] {
    return markdownTasks.map((mdTask, index) => {
      // Try multiple matching strategies in order
      const match =
        this.matchByLineAndText(mdTask, index, metadata) ||
        this.matchByHash(mdTask, metadata) ||
        this.matchByFuzzyText(mdTask, metadata) ||
        this.matchByHierarchy(mdTask, index, metadata);

      return {
        markdownTask: mdTask,
        taskId: match?.id,
        confidence: match?.confidence || 0,
      };
    });
  }
}
```

## Approach 5: Hybrid Smart Matching

### Concept

Combine multiple strategies for maximum reliability:

1. **Primary**: Use metadata file for mappings
2. **Fallback 1**: Match by content hash
3. **Fallback 2**: Match by position + partial text
4. **Fallback 3**: Fuzzy matching with user confirmation

### Example Implementation

```typescript
interface TaskMatcher {
  match(mdTask: MarkdownTask, context: MatchContext): MatchResult;
}

class SmartTaskMatcher {
  private matchers: TaskMatcher[] = [
    new MetadataFileMatcher(), // Check saved mappings
    new ContentHashMatcher(), // Hash of title + hierarchy
    new PositionMatcher(), // Line number + parent
    new FuzzyTextMatcher(), // Levenshtein distance
  ];

  findBestMatch(mdTask: MarkdownTask, candidates: Task[]): MatchResult {
    for (const matcher of this.matchers) {
      const result = matcher.match(mdTask, { candidates });
      if (result.confidence > 0.8) {
        return result;
      }
    }

    // No confident match - might be new task
    return { taskId: null, confidence: 0 };
  }
}
```

## Recommended Solution

Use **Approach 4 (Metadata File)** with **Approach 5 (Smart Matching)** as the algorithm:

### Why?

1. **Clean Markdown**: No IDs or metadata in the file
2. **Robust**: Multiple fallback strategies
3. **Recoverable**: Can rebuild mappings if metadata is lost
4. **User-Friendly**: Natural editing experience
5. **Extensible**: Metadata file can store additional sync state

### Metadata File Structure

```typescript
interface SyncMetadata {
  version: number;
  lastSync: string;
  fileChecksum: string;
  mappings: TaskMapping[];
  syncHistory: SyncEvent[]; // For conflict resolution
}

interface TaskMapping {
  // Identity
  id: string;
  hash: string;

  // Location tracking
  line?: number;
  text: string;
  path: number[]; // Index path in tree

  // Change tracking
  lastModified: string;
  syncCount: number;
}
```

### User Experience

**First Sync:**

```
1. User creates tasks.md with tasks
2. Plugin creates tasks.md.meta.json (hidden)
3. Tasks sync to SuperProductivity with new IDs
4. Mappings saved to metadata file
```

**Subsequent Syncs:**

```
1. Load metadata file
2. Match tasks using smart matching
3. Sync changes bidirectionally
4. Update metadata file
```

**Conflict Recovery:**

```
1. If metadata is missing/corrupted
2. Use content matching to rebuild mappings
3. Show uncertain matches to user for confirmation
4. Rebuild metadata file
```

This approach provides the best balance of usability and reliability for the sync-md plugin.
