# getWorklogStr() Occurrences with Parameters

This file lists all occurrences of `getWorklogStr()` called with parameters, which might have timezone issues.

## List of Occurrences

1. **date.service.ts**

   - `src/app/core/date/date.service.ts`: `return getWorklogStr(date);`

2. **task-repeat-cfg.service.ts**

   - `src/app/features/task-repeat-cfg/task-repeat-cfg.service.ts`: `dueDay: getWorklogStr(targetCreated),`

3. **dialog-edit-task-repeat-cfg.component.ts**

   - `src/app/features/task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component.ts`: `startDate: getWorklogStr(this._data.task.dueWithTime || undefined),`

4. **task-view-customizer.service.ts** (Already fixed)

   - `src/app/features/task-view-customizer/task-view-customizer.service.ts`: Multiple occurrences for date calculations

5. **metric.util.ts**

   - `src/app/features/metric/metric.util.ts`: `start: getWorklogStr(s.start),`

6. **archive.service.ts**

   - `src/app/features/time-tracking/archive.service.ts`: `todayStr: getWorklogStr(now),`

7. **map-archive-to-worklog-weeks.ts**

   - `src/app/features/worklog/util/map-archive-to-worklog-weeks.ts`: `getWorklogStr(entities[task.parentId].created)`
   - `src/app/features/worklog/util/map-archive-to-worklog-weeks.ts`: `return { [getWorklogStr(task.created)]: 1 };`

8. **map-archive-to-worklog.ts**

   - `src/app/features/worklog/util/map-archive-to-worklog.ts`: `getWorklogStr(entities[task.parentId].doneOn || entities[task.parentId].created)`
   - `src/app/features/worklog/util/map-archive-to-worklog.ts`: `return { [getWorklogStr(task.doneOn || task.created)]: 1 };`

9. **worklog-export.component.ts**

   - `src/app/features/worklog/worklog-export/worklog-export.component.ts`: `'tasks' + getWorklogStr(rangeStart) + '-' + getWorklogStr(rangeEnd) + '.csv';`

10. **short-syntax.effects.ts**

    - `src/app/features/tasks/store/short-syntax.effects.ts`: `const plannedDayInIsoFormat = getWorklogStr(plannedDay);`

11. **task-context-menu-inner.component.ts**

    - `src/app/features/tasks/task-context-menu/task-context-menu-inner/task-context-menu-inner.component.ts`: `const newDay = getWorklogStr(newDayDate);`

12. **get-today-str.ts**

    - `src/app/features/tasks/util/get-today-str.ts`: `export const getTodayStr = (): string => getWorklogStr(new Date());`

13. **dialog-view-task-reminders.component.ts**

    - `src/app/features/tasks/dialog-view-task-reminders/dialog-view-task-reminders.component.ts`: `day: getWorklogStr(getTomorrow()),`

14. **dialog-time-estimate.component.ts**

    - `src/app/features/tasks/dialog-time-estimate/dialog-time-estimate.component.ts`: `[getWorklogStr(result.date)]: result.timeSpent,`

15. **tasks-by-tag.component.ts**

    - `src/app/features/tasks/tasks-by-tag/tasks-by-tag.component.ts`: `const yesterdayDayStr = getWorklogStr(yesterdayDate);`

16. **work-context.service.ts**

    - `src/app/features/work-context/work-context.service.ts`: `(t) => !!t && !t.parentId && t.doneOn && getWorklogStr(t.doneOn) === day,`

17. **issue-panel-calendar-agenda.component.ts**

    - `src/app/features/issue-panel/issue-panel-calendar-agenda/issue-panel-calendar-agenda.component.ts`: `const date = getWorklogStr((item.issueData as ICalIssueReduced).start);`

18. **dialog-schedule-task.component.ts**

    - `src/app/features/planner/dialog-schedule-task/dialog-schedule-task.component.ts`: `const newDay = getWorklogStr(newDayDate);`

19. **planner.service.ts**

    - `src/app/features/planner/planner.service.ts`: `if (days[1]?.dayDate === getWorklogStr(tomorrow)) {`

20. **add-tasks-for-tomorrow.service.ts** (Already fixed)

    - `src/app/features/add-tasks-for-tomorrow/add-tasks-for-tomorrow.service.ts`: Multiple occurrences

21. **gitlab-common-interfaces.service.ts**

    - `src/app/features/issue/providers/gitlab/gitlab-common-interfaces.service.ts`: `dueDay: issue.due_date ? getWorklogStr(issue.due_date) : undefined,`

22. **open-project-common-interfaces.service.ts**

    - `src/app/features/issue/providers/open-project/open-project-common-interfaces.service.ts`: `dueDay: issue.startDate ? getWorklogStr(issue.startDate) : undefined,`

23. **create-task-placeholder.component.ts**

    - `src/app/features/schedule/create-task-placeholder/create-task-placeholder.component.ts`: `day: getWorklogStr(this.due()),`

24. **create-blocked-blocks-by-day-map.ts**

    - `src/app/features/schedule/map-schedule-data/create-blocked-blocks-by-day-map.ts`: `const dayStartDateStr = getWorklogStr(block.start);`
    - `src/app/features/schedule/map-schedule-data/create-blocked-blocks-by-day-map.ts`: `const dayStr = getWorklogStr(curDateTs);`

25. **get-simple-counter-streak-duration.ts**

    - `src/app/features/simple-counter/get-simple-counter-streak-duration.ts`: Multiple occurrences

26. **navigate-to-task.service.ts**
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
