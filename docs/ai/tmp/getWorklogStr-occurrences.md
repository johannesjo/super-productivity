# getWorklogStr() Occurrences with Parameters

This file lists all occurrences of `getWorklogStr()` called with parameters, which might have timezone issues.

## List of Occurrences

### Completed

1. **task-repeat-cfg.service.ts** ✓ (No fix needed - tested and works correctly)

   - `src/app/features/task-repeat-cfg/task-repeat-cfg.service.ts`: `dueDay: getWorklogStr(targetCreated),`

2. **short-syntax.effects.ts** ✓ (No fix needed - tested and works correctly)

   - `src/app/features/tasks/store/short-syntax.effects.ts`: `const plannedDayInIsoFormat = getWorklogStr(plannedDay);`

3. **dialog-schedule-task.component.ts** ✓ (No fix needed - already uses dateStrToUtcDate)

   - `src/app/features/planner/dialog-schedule-task/dialog-schedule-task.component.ts`: `const newDay = getWorklogStr(newDayDate);`

4. **work-context.service.ts** ✓ (No fix needed - works correctly)

   - `src/app/features/work-context/work-context.service.ts`: `(t) => !!t && !t.parentId && t.doneOn && getWorklogStr(t.doneOn) === day,`

5. **gitlab-common-interfaces.service.ts** ✓ (Fixed - use date string directly)

   - `src/app/features/issue/providers/gitlab/gitlab-common-interfaces.service.ts`: `dueDay: issue.due_date ? getWorklogStr(issue.due_date) : undefined,`

6. **open-project-common-interfaces.service.ts** ✓ (Fixed - use date string directly)

   - `src/app/features/issue/providers/open-project/open-project-common-interfaces.service.ts`: `dueDay: issue.startDate ? getWorklogStr(issue.startDate) : undefined,`

7. **task-view-customizer.service.ts** ✓ (Already fixed in previous session)

   - `src/app/features/task-view-customizer/task-view-customizer.service.ts`: Multiple occurrences for date calculations

8. **add-tasks-for-tomorrow.service.ts** ✓ (Already fixed in previous session)

   - `src/app/features/add-tasks-for-tomorrow/add-tasks-for-tomorrow.service.ts`: Multiple occurrences

9. **dialog-edit-task-repeat-cfg.component.ts** ✓ (No fix needed - converts timestamp to local date string correctly)

   - `src/app/features/task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component.ts`: `startDate: getWorklogStr(this._data.task.dueWithTime || undefined),`

10. **date.service.ts** ✓ (No fix needed - utility wrapper for converting timestamps to local date strings)

- `src/app/core/date/date.service.ts`: `return getWorklogStr(date);`

11. **metric.util.ts** ✓ (No fix needed - converts timestamp to local date string for metrics display)

- `src/app/features/metric/metric.util.ts`: `start: getWorklogStr(s.start),`

12. **archive.service.ts** ✓ (No fix needed - converts current timestamp to today string for archiving)

- `src/app/features/time-tracking/archive.service.ts`: `todayStr: getWorklogStr(now),`

13. **map-archive-to-worklog-weeks.ts** ✓ (No fix needed - converts timestamps to local date strings for worklog)

- `src/app/features/worklog/util/map-archive-to-worklog-weeks.ts`: `getWorklogStr(entities[task.parentId].created)`
- `src/app/features/worklog/util/map-archive-to-worklog-weeks.ts`: `return { [getWorklogStr(task.created)]: 1 };`

14. **map-archive-to-worklog.ts** ✓ (No fix needed - converts doneOn/created timestamps to local date strings)

- `src/app/features/worklog/util/map-archive-to-worklog.ts`: `getWorklogStr(entities[task.parentId].doneOn || entities[task.parentId].created)`
- `src/app/features/worklog/util/map-archive-to-worklog.ts`: `return { [getWorklogStr(task.doneOn || task.created)]: 1 };`

15. **worklog-export.component.ts** ✓ (No fix needed - converts Date objects to date strings for filename)

- `src/app/features/worklog/worklog-export/worklog-export.component.ts`: `'tasks' + getWorklogStr(rangeStart) + '-' + getWorklogStr(rangeEnd) + '.csv';`

16. **task-context-menu-inner.component.ts** ✓ (No fix needed - converts Date objects for task scheduling)

- `src/app/features/tasks/task-context-menu/task-context-menu-inner/task-context-menu-inner.component.ts`: `const newDay = getWorklogStr(newDayDate);`

17. **get-today-str.ts** ✓ (No fix needed - utility function for today's date string)

- `src/app/features/tasks/util/get-today-str.ts`: `export const getTodayStr = (): string => getWorklogStr(new Date());`

18. **dialog-view-task-reminders.component.ts** ✓ (No fix needed - converts tomorrow Date to date string)

- `src/app/features/tasks/dialog-view-task-reminders/dialog-view-task-reminders.component.ts`: `day: getWorklogStr(getTomorrow()),`

### Remaining

1. **dialog-time-estimate.component.ts**

   - `src/app/features/tasks/dialog-time-estimate/dialog-time-estimate.component.ts`: `[getWorklogStr(result.date)]: result.timeSpent,`

2. **tasks-by-tag.component.ts**

   - `src/app/features/tasks/tasks-by-tag/tasks-by-tag.component.ts`: `const yesterdayDayStr = getWorklogStr(yesterdayDate);`

3. **issue-panel-calendar-agenda.component.ts**

   - `src/app/features/issue-panel/issue-panel-calendar-agenda/issue-panel-calendar-agenda.component.ts`: `const date = getWorklogStr((item.issueData as ICalIssueReduced).start);`

4. **planner.service.ts**

   - `src/app/features/planner/planner.service.ts`: `if (days[1]?.dayDate === getWorklogStr(tomorrow)) {`

5. **create-task-placeholder.component.ts**

   - `src/app/features/schedule/create-task-placeholder/create-task-placeholder.component.ts`: `day: getWorklogStr(this.due()),`

6. **create-blocked-blocks-by-day-map.ts**

   - `src/app/features/schedule/map-schedule-data/create-blocked-blocks-by-day-map.ts`: `const dayStartDateStr = getWorklogStr(block.start);`
   - `src/app/features/schedule/map-schedule-data/create-blocked-blocks-by-day-map.ts`: `const dayStr = getWorklogStr(curDateTs);`

7. **get-simple-counter-streak-duration.ts**

   - `src/app/features/simple-counter/get-simple-counter-streak-duration.ts`: Multiple occurrences

8. **navigate-to-task.service.ts**
   - `src/app/core-ui/navigate-to-task/navigate-to-task.service.ts`: `return dateStr ?? getWorklogStr(parentTask.created);`
   - `src/app/core-ui/navigate-to-task/navigate-to-task.service.ts`: `return getWorklogStr(task.created);`

## Analysis Plan

For each occurrence, we need to:

1. Understand if the date parameter is a timestamp (number) or Date object
2. Determine if timezone conversion could cause issues
3. Write tests that demonstrate any timezone bugs
4. Apply fixes if needed

## Priority

High priority items (likely to cause user-visible bugs):

- task-repeat-cfg.service.ts (affects repeating tasks)
- short-syntax.effects.ts (affects task creation)
- dialog-schedule-task.component.ts (affects scheduling)
- work-context.service.ts (affects done tasks)
- Issue provider services (gitlab, open-project)

Medium priority (data display/export):

- worklog utilities
- metric.util.ts
- navigate-to-task.service.ts

Low priority (utility functions that might be correct):

- date.service.ts (wrapper function)
- archive.service.ts
- get-today-str.ts
