import { TaskWithSubTasks } from '../tasks/task.model';

describe('WorkContext - Later Today filtering logic', () => {
  const createMockTask = (overrides: Partial<TaskWithSubTasks>): TaskWithSubTasks =>
    ({
      id: 'MOCK_TASK_ID',
      title: 'Mock Task',
      isDone: false,
      tagIds: [],
      parentId: null,
      subTaskIds: [],
      subTasks: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      reminderId: null,
      dueWithTime: undefined,
      dueDay: null,
      hasPlannedTime: false,
      repeatCfgId: null,
      notes: '',
      issueId: null,
      issueType: null,
      issueWasUpdated: null,
      issueLastUpdated: null,
      issueTimeTracked: null,
      attachments: [],
      projectId: null,
      _showSubTasksMode: 0,
      _currentTab: 0,
      _isTaskPlaceHolder: false,
      ...overrides,
    }) as TaskWithSubTasks;

  // This is the filtering logic from work-context.service.ts
  const filterUndoneTasks = (tasks: TaskWithSubTasks[]): TaskWithSubTasks[] => {
    return tasks.filter((task) => {
      if (!task || task.isDone) {
        return false;
      }

      // Filter out tasks scheduled for later today
      if (task.dueWithTime) {
        const now = Date.now();
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // If the task is scheduled for later today, exclude it
        if (task.dueWithTime >= now && task.dueWithTime <= todayEnd.getTime()) {
          return false;
        }
      }

      return true;
    });
  };

  beforeEach(() => {
    // Mock current time to be 10 AM for consistent testing
    jasmine.clock().install();
    const currentTime = new Date();
    currentTime.setHours(10, 0, 0, 0);
    jasmine.clock().mockDate(currentTime);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should filter out tasks scheduled for later today', () => {
    const todayAt = (hours: number, minutes: number = 0): number => {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.getTime();
    };

    const mockTasks: TaskWithSubTasks[] = [
      // Task scheduled for later today (should be filtered out)
      createMockTask({
        id: 'LATER_TODAY',
        title: 'Meeting at 2 PM',
        dueWithTime: todayAt(14, 0),
      }),
      // Task scheduled for earlier today (should be included)
      createMockTask({
        id: 'EARLIER_TODAY',
        title: 'Morning standup',
        dueWithTime: todayAt(8, 0),
      }),
      // Task without scheduled time (should be included)
      createMockTask({
        id: 'UNSCHEDULED',
        title: 'Unscheduled task',
        dueWithTime: undefined,
      }),
      // Done task (should be filtered out)
      createMockTask({
        id: 'DONE_TASK',
        title: 'Completed task',
        isDone: true,
      }),
    ];

    const filtered = filterUndoneTasks(mockTasks);

    expect(filtered.length).toBe(2);
    expect(filtered.find((t) => t.id === 'LATER_TODAY')).toBeUndefined();
    expect(filtered.find((t) => t.id === 'EARLIER_TODAY')).toBeDefined();
    expect(filtered.find((t) => t.id === 'UNSCHEDULED')).toBeDefined();
    expect(filtered.find((t) => t.id === 'DONE_TASK')).toBeUndefined();
  });

  it('should include tasks scheduled for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'TOMORROW_TASK',
        title: 'Tomorrow meeting',
        dueWithTime: tomorrow.getTime(),
      }),
    ];

    const filtered = filterUndoneTasks(mockTasks);

    expect(filtered.length).toBe(1);
    expect(filtered.find((t) => t.id === 'TOMORROW_TASK')).toBeDefined();
  });

  it('should filter out task scheduled exactly at current time', () => {
    const now = Date.now();

    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'CURRENT_TIME_TASK',
        title: 'Task at current time',
        dueWithTime: now,
      }),
    ];

    const filtered = filterUndoneTasks(mockTasks);

    // Task scheduled at exactly current time should be filtered out
    expect(filtered.length).toBe(0);
    expect(filtered.find((t) => t.id === 'CURRENT_TIME_TASK')).toBeUndefined();
  });

  it('should handle edge case at end of day', () => {
    // Test at 11:59 PM
    const lateTime = new Date();
    lateTime.setHours(23, 59, 0, 0);
    jasmine.clock().mockDate(lateTime);

    const todayAt = (hours: number, minutes: number = 0): number => {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.getTime();
    };

    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'LATE_TASK',
        title: 'Late task',
        dueWithTime: todayAt(23, 59),
      }),
    ];

    const filtered = filterUndoneTasks(mockTasks);

    // Task scheduled for the same minute should be filtered out
    expect(filtered.length).toBe(0);
  });

  it('should not filter overdue tasks from yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(14, 0, 0, 0);

    const mockTasks: TaskWithSubTasks[] = [
      createMockTask({
        id: 'OVERDUE_TASK',
        title: 'Overdue from yesterday',
        dueWithTime: yesterday.getTime(),
      }),
    ];

    const filtered = filterUndoneTasks(mockTasks);

    expect(filtered.length).toBe(1);
    expect(filtered.find((t) => t.id === 'OVERDUE_TASK')).toBeDefined();
  });
});
