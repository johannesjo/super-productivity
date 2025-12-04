# Reminder Refactoring Plan

## Objective

Refactor the Reminder system to eliminate the standalone `reminders` model and persistence file. Instead, reminder data (specifically `remindAt`) will be stored directly on the `Task` model. Reminders for Notes will be discontinued.

## Motivation

1.  **Operation Log Consistency**: Currently, reminders are stored independently and changes bypass the main NgRx/Operation Log system used for sync. Integrating them into `Task` ensures all reminder changes are properly tracked and synced.
2.  **Performance**: Reducing the number of files synced (removing `reminders.json`) improves performance, especially for WebDAV users.
3.  **Simplicity**: Reduces complexity by removing an entire state slice and its associated management logic.

## Proposed Architecture

### 1. Data Model Changes

**Remove**:

- `Reminder` model (standalone entity).
- `RecurringConfig` (found to be unused).
- `Note` reminders support.

**Update**:

- **Task Model**:
  - Remove `reminderId: string`.
  - Add `remindAt: number | null` (timestamp).

### 2. Persistence Layer

- Remove `reminders` from `BASE_MODEL_CFGS` in `src/app/core/persistence/persistence.const.ts`.
- Ensure `Task` persistence (which already exists) captures the new `remindAt` field.

### 3. Service Layer (`ReminderService`)

The `ReminderService` will transition from a state-holding service to a facade that interacts with the Task Store.

- **State Management**: Remove local `_reminders` array, `BehaviorSubject`, and manual persistence calls (`_saveModel`, `loadFromDatabase`).
- **Data Source**:
  - Inject `Store`.
  - Create a selector `selectTasksWithReminders` in Task Store.
  - `onRemindersActive$` will subscribe to this selector (mapped to the format expected by the worker).
- **Actions**:
  - `addReminder(taskId, remindAt)`: Dispatch `updateTask({ id: taskId, changes: { remindAt } })`.
  - `updateReminder(taskId, changes)`: Dispatch `updateTask({ id: taskId, changes: { remindAt: changes.remindAt } })`.
  - `removeReminder(taskId)`: Dispatch `updateTask({ id: taskId, changes: { remindAt: null } })`.
  - `snooze(taskId, snoozeTime)`: Dispatch `updateTask` with new calculated time.
- **Worker Integration**:
  - Continue to use `reminder.worker.ts`.
  - The service will map `Task` objects to the lightweight structure expected by the worker (id, title, remindAt, type='TASK').

### 4. Migration Strategy

A migration must run **once** on startup to transfer existing reminder data to tasks.

**Migration Logic**:

1.  Load the legacy `reminders` state (from `reminders.json` or IndexedDB).
2.  Load the `task` state.
3.  Iterate through all legacy reminders:
    - If `type === 'NOTE'`: Discard (log warning if needed).
    - If `type === 'TASK'`: Find the corresponding Task by `relatedId`. Update its `remindAt` property with the reminder's `remindAt`.
4.  Save the updated `task` state.
5.  Delete/Clear the `reminders` state to prevent future conflicts.

### 5. UI & Cleanup

- **Dialogs**: Update `DialogViewTaskReminders` and "Add/Edit Reminder" dialogs to read/write `task.remindAt` instead of looking up a separate reminder object.
- **Note UI**: Remove "Add Reminder" options from Note context menus and buttons.
- **Code Removal**: Delete unused `reminder.model.ts` (or reduce to Worker interface), remove Note-specific reminder logic.

## Implementation Steps

1.  **Backup**: Ensure data is backed up before applying changes.
2.  **Model Update**: specificy `remindAt` in `TaskCopy` / `Task`.
3.  **Migration Script**: Implement the logic to merge `reminders` into `tasks`.
4.  **Service Refactoring**: Rewrite `ReminderService` to use `TaskStore`.
5.  **UI Adjustments**: Fix compilation errors in components accessing `reminderId`.
6.  **Cleanup**: Remove dead code and `reminders` persistence config.
7.  **Verification**: Test adding, snoozing, completing, and removing reminders. Verify sync behavior.
