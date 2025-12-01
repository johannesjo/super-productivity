# Markdown ID Inspection Results

## Overview

The SuperProductivity sync-md plugin uses HTML comments embedded in task notes to track the relationship between SuperProductivity tasks and their corresponding markdown file entries.

## ID Format

The plugin uses the following format to store markdown IDs in task notes:

```
<!-- sp:id -->
```

Where `id` is typically the task ID from SuperProductivity, creating a bidirectional link between the task and its markdown representation.

## How It Works

1. **In Markdown Files**: When tasks are synced to markdown, each task line includes the ID:

   ```markdown
   - [ ] <!-- sp:task-id-123 --> Task title here
   - [x] <!-- sp:task-id-456 --> Completed task
   ```

2. **In SuperProductivity**: The same ID is stored in the task's notes field, allowing the sync process to match tasks between the two systems.

## Inspection Script

A script has been created at `/scripts/inspect-sync.ts` that can be run within the SuperProductivity plugin context to:

- Count total tasks and how many have markdown IDs
- Find duplicate IDs (potential sync issues)
- Identify orphaned IDs (where markdown ID differs from task ID)
- Group tasks by project
- Detect malformed ID patterns

### Running the Inspection

To run the inspection script:

1. Ensure the sync-md plugin is loaded in SuperProductivity
2. The script will automatically execute when loaded in the plugin context
3. Check the console output for detailed results

### What to Look For

- **No IDs Found**: If no tasks have markdown IDs, it means no tasks have been synced to markdown yet
- **Duplicate IDs**: Multiple tasks sharing the same markdown ID indicates a sync problem
- **Orphaned IDs**: When the markdown ID doesn't match the task ID, it might indicate manual edits
- **Malformed IDs**: IDs with incorrect formatting that might not sync properly

## Common Patterns

Based on the code analysis, here are the patterns the plugin uses:

1. **Standard Format**: `<!-- sp:task-id -->` - Used by the sync-md plugin
2. **Legacy Format**: `(task-id)` - Used in older sync logic (in parentheses at start of title)

## Troubleshooting

If tasks aren't syncing properly:

1. Run the inspection script to check for ID issues
2. Look for duplicate or malformed IDs
3. Check if tasks have notes field populated
4. Verify the markdown file has the correct ID format

## Technical Details

- IDs are sanitized to only contain: `a-zA-Z0-9_-`
- The ID comment must have exact spacing: `<!-- sp:id -->`
- IDs are parsed using regex: `/<!-- sp:([a-zA-Z0-9_-]+) -->/`
- The sync process matches tasks by these IDs to determine what needs updating
