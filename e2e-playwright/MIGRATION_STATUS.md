# E2E Tests Migration Status

## Summary

- **Total Nightwatch Tests**: 34
- **Successfully Migrated**: 20 (58.8%)
- **Still Need Migration**: 12
- **Skipped/Commented**: 3
- **New Tests Created**: 2

## Successfully Migrated Tests (20)

- ✅ all-basic-routes-without-error
- ✅ autocomplete/autocomplete-dropdown
- ✅ daily-summary/daily-summary
- ✅ issue-provider-panel/issue-provider-panel
- ✅ navigation/basic-navigation (new test)
- ✅ performance/perf2
- ✅ plugins/enable-plugin-test
- ✅ plugins/plugin-enable-verify
- ✅ plugins/plugin-feature-check
- ✅ plugins/plugin-structure-test
- ✅ plugins/test-plugin-visibility
- ✅ project/project
- ✅ reminders/reminders-schedule-page
- ✅ reminders/reminders-view-task
- ✅ short-syntax/short-syntax
- ✅ task-basic/task-crud (new test)
- ✅ task-list-basic/finish-day-quick-history
- ✅ task-list-basic/finish-day-quick-history-with-subtasks
- ✅ task-list-basic/task-list-start-stop
- ✅ work-view/work-view

## Tests Still Needing Migration (12)

### Sync Tests (1)

- sync/webdav-basic

### Plugin Tests (4)

- plugins/plugin-upload
- plugins/plugin-lifecycle
- plugins/plugin-iframe
- plugins/plugin-loading

### Planner Tests (6)

- planner/planner-drag-drop
- planner/planner-multiple-days
- planner/planner-navigation
- planner/planner-scheduled-tasks
- planner/planner-time-estimates
- planner/planner-basic (commented out but could be migrated)

### Reminder Tests (2)

- reminders/reminders-view-task2
- reminders/reminders-view-task4

## Skipped/Commented Tests (3)

1. **perf.e2e.ts** - Active but uses custom performance methods

   - Uses enablePerformanceMetrics() and getPerformanceMetrics()

2. **planner/planner-basic.e2e.ts** - Fully commented out

   - Reason: Unknown, entire file is commented
   - Was running with Nightwatch: No

3. **project-note/project-note.e2e.ts** - Fully commented out
   - Reason: Unknown, entire file is commented
   - Was running with Nightwatch: No

## Failed Migration Attempts

- **task-list-basic/simple-subtask** - Attempted but removed due to keyboard shortcut issues with 'a' key triggering in textarea instead of creating subtask

## Notes

- When migrating, preserve exact selectors from Nightwatch tests
- Avoid adding timeouts unless absolutely necessary
- Keep test structure as close to original as possible
- Each test should be committed separately after verification
