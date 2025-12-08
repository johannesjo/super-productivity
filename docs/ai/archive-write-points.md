# Archive Write Points Documentation

This document tracks all locations where archive storage (IndexedDB) is written to, ensuring archive integrity and preventing unexpected writes.

## Single Source of Truth: ArchiveOperationHandler

All archive write operations MUST go through `ArchiveOperationHandler`. This handler is the centralized point for all archive storage operations.

### File Location

`src/app/core/persistence/operation-log/processing/archive-operation-handler.service.ts`

### Entry Points

1. **Local Operations**: `ArchiveOperationHandlerEffects` → `ArchiveOperationHandler.handleOperation()`
2. **Remote Operations**: `OperationApplierService` → `ArchiveOperationHandler.handleOperation()`

## Archive-Affecting Actions

The following actions trigger archive writes (defined in `ARCHIVE_AFFECTING_ACTION_TYPES`):

| Action                                      | Handler Method                | Archive Operation                              |
| ------------------------------------------- | ----------------------------- | ---------------------------------------------- |
| `TaskSharedActions.moveToArchive`           | `_handleMoveToArchive`        | Write tasks to archiveYoung (remote only)      |
| `TaskSharedActions.restoreTask`             | `_handleRestoreTask`          | Delete task from archive                       |
| `flushYoungToOld`                           | `_handleFlushYoungToOld`      | Move old tasks from archiveYoung to archiveOld |
| `TaskSharedActions.deleteProject`           | `_handleDeleteProject`        | Remove all tasks for deleted project           |
| `deleteTag` / `deleteTags`                  | `_handleDeleteTags`           | Remove tag references, delete orphaned tasks   |
| `TaskSharedActions.deleteTaskRepeatCfg`     | `_handleDeleteTaskRepeatCfg`  | Remove repeatCfgId from tasks                  |
| `TaskSharedActions.deleteIssueProvider`     | `_handleDeleteIssueProvider`  | Unlink issue data from tasks                   |
| `IssueProviderActions.deleteIssueProviders` | `_handleDeleteIssueProviders` | Unlink issue data from multiple tasks          |

## Special Case: moveToArchive

For `moveToArchive`, there's a special handling distinction:

- **Local operations**: Archive is written BEFORE the action is dispatched by `ArchiveService.moveToArchive()`. The handler skips local operations to avoid double-writes.
- **Remote operations**: Archive is written AFTER the action is dispatched by `ArchiveOperationHandler._handleMoveToArchive()`.

## Operation Flow

```
LOCAL OPERATION FLOW:
User Action → Action Dispatched → Reducer → ArchiveOperationHandlerEffects
                                                    ↓
                                          ArchiveOperationHandler.handleOperation()
                                                    ↓
                                            Archive Written (IndexedDB)

REMOTE OPERATION FLOW:
OperationApplierService → store.dispatch(action) → Reducer
                       ↓
              ArchiveOperationHandler.handleOperation()
                       ↓
                Archive Written (IndexedDB)
```

## Files That Should NOT Write to Archive

The following effect files previously contained archive write logic and have been deprecated:

| Deprecated File                                    | Replacement                    |
| -------------------------------------------------- | ------------------------------ |
| `archive.effects.ts`                               | ArchiveOperationHandlerEffects |
| `project.effects.ts` (archive portion)             | ArchiveOperationHandlerEffects |
| `tag.effects.ts` (archive portion)                 | ArchiveOperationHandlerEffects |
| `task-repeat-cfg.effects.ts` (archive portion)     | ArchiveOperationHandlerEffects |
| `unlink-all-tasks-on-provider-deletion.effects.ts` | ArchiveOperationHandlerEffects |

## Verification Checklist

When adding new archive-affecting operations:

1. [ ] Add action type to `ARCHIVE_AFFECTING_ACTION_TYPES` in `archive-operation-handler.service.ts`
2. [ ] Implement handler method in `ArchiveOperationHandler`
3. [ ] Add test cases in `archive-operation-handler.service.spec.ts`
4. [ ] Update this documentation
5. [ ] Ensure no direct archive writes in effects (use ArchiveOperationHandler)

## How to Find All Archive Writes

To verify no unexpected archive writes exist:

```bash
# Search for direct PfapiService archive writes
grep -r "archiveYoung.save\|archiveOld.save" src/app --include="*.ts" | grep -v "archive-operation-handler\|archive.service"

# Search for TaskArchiveService archive-modifying methods
grep -r "removeAllArchiveTasksForProject\|removeTagsFromAllTasks\|removeRepeatCfgFromArchiveTasks\|unlinkIssueProviderFromArchiveTasks\|deleteTasks" src/app --include="*.ts" | grep -v "archive-operation-handler\|\.spec\.ts"
```

Expected results: All matches should be in `ArchiveOperationHandler`, `ArchiveService`, or `TaskArchiveService`.
