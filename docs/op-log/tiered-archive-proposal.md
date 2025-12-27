# Tiered Archive Model Proposal

**Date:** December 5, 2025
**Status:** Draft

---

## Overview

Introduce a tiered archive system that bounds the operation log to a configurable time window, making full op-log sync viable while preserving historical time tracking data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Active Tasks (~500)         │  Op-log synced (real-time)
├─────────────────────────────────────────────────────────┤
│  Recent Archive (0-3 years)  │  Op-log synced (full data)
├─────────────────────────────────────────────────────────┤
│  Old Archive (3+ years)      │  Compressed to time stats
│                              │  Device-local only
└─────────────────────────────────────────────────────────┘
```

### Tiers

| Tier           | Age       | Data               | Sync Method        |
| -------------- | --------- | ------------------ | ------------------ |
| Active         | Current   | Full task data     | Op-log (real-time) |
| Recent Archive | 0-3 years | Full task data     | Op-log (real-time) |
| Old Archive    | 3+ years  | Time tracking only | Device-local       |

---

## Configuration

```typescript
interface ArchiveConfig {
  // Years of full task data to keep synced
  // Tasks older than this are converted to time tracking records
  recentArchiveYears: number; // Default: 3
}
```

### Rationale for 3-Year Default

- Covers most practical use cases (searching recent work)
- Bounds synced task count to ~5,500 tasks (assuming 5 tasks/day)
- Keeps op-log manageable for initial sync
- Still preserves time tracking data indefinitely

---

## Data Model

### Recent Archive (Synced)

Full `TaskWithSubTasks` data, same as today.

### Old Archive (Compressed)

```typescript
interface TimeTrackingRecord {
  date: string; // YYYY-MM-DD
  projectId?: string;
  tagIds: string[];
  timeSpent: number; // milliseconds
}

interface OldArchiveModel {
  // Aggregated time tracking data
  timeTracking: TimeTrackingRecord[];

  // Summary stats
  totalTasksConverted: number;
  oldestConvertedDate: string;
}
```

### Size Comparison

| Model                              | 10 Years of Data        |
| ---------------------------------- | ----------------------- |
| Full tasks (current)               | ~40MB (20K tasks × 2KB) |
| Tiered (3yr full + 7yr compressed) | ~12MB + ~250KB          |

---

## Implementation

### Conversion Trigger

Run during daily archive flush:

```typescript
async flushArchive(): Promise<void> {
  // Existing flush logic...

  // After flush, check for tasks to convert
  await this.convertOldArchiveTasks();
}

async convertOldArchiveTasks(): Promise<void> {
  const cutoffDate = subYears(new Date(), config.recentArchiveYears);
  const tasksToConvert = await this.getTasksArchivedBefore(cutoffDate);

  if (tasksToConvert.length === 0) return;

  // Extract time tracking data
  const timeRecords = tasksToConvert.flatMap(task =>
    Object.entries(task.timeSpentOnDay).map(([date, ms]) => ({
      date,
      projectId: task.projectId,
      tagIds: task.tagIds,
      timeSpent: ms,
    }))
  );

  // Append to old archive
  await this.appendToOldArchive(timeRecords);

  // Remove from recent archive
  await this.removeFromRecentArchive(tasksToConvert.map(t => t.id));
}
```

### Op-Log Compaction

With bounded recent archive, compaction becomes straightforward:

1. Snapshot current state (active + recent archive)
2. Discard all ops older than snapshot
3. Old archive is excluded from op-log entirely

---

## Migration Path

### Phase 1: Implement Tiered Model

- Add `OldArchiveModel` storage
- Implement conversion logic
- Add configuration option

### Phase 2: Enable by Default

- Set 3-year default
- Run initial conversion on existing archives

### Phase 3: Op-Log Optimization

- Exclude old archive from op-log
- Implement efficient compaction

---

## Trade-offs

### What Users Lose (for 3+ year old tasks)

- Task titles and details
- Notes and attachments
- Issue links
- Ability to restore individual tasks

### What Users Keep

- Time tracking per day/project/tag (for reports)
- Summary statistics

### Mitigation

- 3-year default is generous
- Configurable for users who need more
- Time tracking data (the main value) is preserved

---

## Open Questions

1. **Should old archive sync via PFAPI?**

   - Pro: Data available on all devices
   - Con: Adds complexity, defeats purpose of bounding sync
   - Recommendation: Device-local only (users can export/import manually)

2. **Count-based alternative?**

   - Instead of years, keep last N tasks (e.g., 5000)
   - More predictable performance characteristics
   - Could offer both options

3. **What about subtasks?**
   - Convert parent and subtasks together
   - Aggregate time tracking at parent level?

---

## Success Metrics

- Op-log initial sync < 10 seconds for typical users
- Archive operation payload < 100KB
- Memory usage stable regardless of total historical tasks
