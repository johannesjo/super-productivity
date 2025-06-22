import { selectLaterTodayTasksWithSubTasks } from './task.selectors';
import { Task, TaskState } from '../task.model';

describe('selectLaterTodayTasksWithSubTasks', () => {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).toISOString();

  // Current time for testing (e.g., 10:00 AM)
  const currentTime = new Date();
  currentTime.setHours(10, 0, 0, 0);
  const currentTimeMs = currentTime.getTime();

  // Helper to create timestamps for today at specific times
  const todayAt = (hours: number, minutes: number = 0): number => {
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };

  // Helper to create TaskState from array of tasks
  const createTaskState = (tasks: Task[]): TaskState => {
    const entities = tasks.reduce((acc, task) => ({ ...acc, [task.id]: task }), {});
    const ids = tasks.map((t) => t.id);
    return {
      entities,
      ids,
      currentTaskId: null,
      selectedTaskId: null,
      lastCurrentTaskId: null,
      taskDetailTargetPanel: 'Default' as any,
      isDataLoaded: true,
    } as TaskState;
  };

  const createMockTask = (overrides: Partial<Task>): Task =>
    ({
      id: 'MOCK_TASK_ID',
      title: 'Mock Task',
      isDone: false,
      tagIds: [],
      parentId: null,
      subTaskIds: [],
      timeSpentOnDay: {},
      timeSpent: 0,
      timeEstimate: 0,
      reminderId: null,
      dueWithTime: null,
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
    }) as Task;

  const mockAllTasks: Task[] = [
    // Task scheduled for later today (2 PM)
    createMockTask({
      id: 'LATER_TODAY_1',
      title: 'Meeting at 2 PM',
      dueWithTime: todayAt(14, 0),
      tagIds: ['TODAY'],
    }),

    // Task scheduled for even later today (6 PM)
    createMockTask({
      id: 'LATER_TODAY_2',
      title: 'Exercise at 6 PM',
      dueWithTime: todayAt(18, 0),
      tagIds: ['TODAY'],
    }),

    // Task scheduled for earlier today (already passed - 8 AM)
    createMockTask({
      id: 'EARLIER_TODAY',
      title: 'Morning standup',
      dueWithTime: todayAt(8, 0),
      tagIds: ['TODAY'],
    }),

    // Task scheduled for tomorrow
    createMockTask({
      id: 'TOMORROW_TASK',
      title: 'Tomorrow task',
      dueWithTime: new Date(tomorrow).setHours(10, 0, 0, 0),
      tagIds: ['TODAY'],
    }),

    // Task in TODAY but without dueWithTime
    createMockTask({
      id: 'UNSCHEDULED_TODAY',
      title: 'Unscheduled today task',
      dueWithTime: undefined,
      tagIds: ['TODAY'],
    }),

    // Task scheduled for later but already done
    createMockTask({
      id: 'DONE_LATER_TODAY',
      title: 'Done task',
      dueWithTime: todayAt(15, 0),
      isDone: true,
      tagIds: ['TODAY'],
    }),

    // Task scheduled for later but not in TODAY
    createMockTask({
      id: 'NOT_TODAY_SCHEDULED',
      title: 'Not in today',
      dueWithTime: todayAt(16, 0),
      tagIds: [],
    }),

    // Parent task with subtasks
    createMockTask({
      id: 'PARENT_LATER',
      title: 'Parent task for later',
      dueWithTime: todayAt(17, 0),
      tagIds: ['TODAY'],
      subTaskIds: ['SUB_1', 'SUB_2'],
    }),

    // Subtasks
    createMockTask({
      id: 'SUB_1',
      title: 'Subtask 1',
      parentId: 'PARENT_LATER',
      tagIds: ['TODAY'],
    }),

    createMockTask({
      id: 'SUB_2',
      title: 'Subtask 2',
      parentId: 'PARENT_LATER',
      tagIds: ['TODAY'],
    }),
  ];

  beforeEach(() => {
    // Mock current time to be 10 AM for consistent testing
    jasmine.clock().install();
    jasmine.clock().mockDate(currentTime);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should select tasks scheduled for later today', () => {
    // Only pass IDs of tasks that are in TODAY tag
    const todayTaskIds = mockAllTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      todayTaskIds,
    );

    const taskIds = result.map((t) => t.id);
    // The result includes main tasks and their subtasks
    // Note: SUB_1 and SUB_2 don't have dueWithTime set, so PARENT_LATER is included
    // because it has dueWithTime, not because of its subtasks
    expect(taskIds).toContain('LATER_TODAY_1');
    expect(taskIds).toContain('LATER_TODAY_2');
    expect(taskIds).toContain('PARENT_LATER');
    expect(taskIds).toContain('SUB_1');
    expect(taskIds).toContain('SUB_2');
    expect(result.length).toBe(5);
  });

  it('should not include tasks scheduled for earlier today', () => {
    const todayTaskIds = mockAllTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      todayTaskIds,
    );

    const taskIds = result.map((t) => t.id);
    expect(taskIds).not.toContain('EARLIER_TODAY');
  });

  it('should not include tasks scheduled for tomorrow', () => {
    const todayTaskIds = mockAllTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      todayTaskIds,
    );

    const taskIds = result.map((t) => t.id);
    expect(taskIds).not.toContain('TOMORROW_TASK');
  });

  it('should not include unscheduled tasks', () => {
    const todayTaskIds = mockAllTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      todayTaskIds,
    );

    const taskIds = result.map((t) => t.id);
    expect(taskIds).not.toContain('UNSCHEDULED_TODAY');
  });

  it('should not include done tasks', () => {
    const todayTaskIds = mockAllTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      todayTaskIds,
    );

    const taskIds = result.map((t) => t.id);
    expect(taskIds).not.toContain('DONE_LATER_TODAY');
  });

  it('should only include tasks that are in TODAY tag', () => {
    const todayTaskIds = mockAllTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      todayTaskIds,
    );

    const taskIds = result.map((t) => t.id);
    expect(taskIds).not.toContain('NOT_TODAY_SCHEDULED');
  });

  it('should include parent tasks with their subtasks', () => {
    const todayTaskIds = mockAllTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      todayTaskIds,
    );

    const parentIndex = result.findIndex((t) => t.id === 'PARENT_LATER');
    expect(parentIndex).toBeGreaterThan(-1);

    // Check that subtasks follow parent
    expect(result[parentIndex + 1].id).toBe('SUB_1');
    expect(result[parentIndex + 2].id).toBe('SUB_2');
  });

  it('should handle edge case of task scheduled exactly at current time', () => {
    const taskAtCurrentTime = createMockTask({
      id: 'CURRENT_TIME_TASK',
      title: 'Task at current time',
      dueWithTime: currentTimeMs,
      tagIds: ['TODAY'],
    });

    const tasksWithCurrent = [...mockAllTasks, taskAtCurrentTime];
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(tasksWithCurrent),
      [
        ...mockAllTasks.filter((t) => t.tagIds.includes('TODAY')).map((t) => t.id),
        'CURRENT_TIME_TASK',
      ],
    );

    // Task scheduled at exactly current time should be included
    const taskIds = result.map((t) => t.id);
    expect(taskIds).toContain('CURRENT_TIME_TASK');
  });

  it('should handle midnight edge case', () => {
    // Test at 11:59 PM
    const lateTime = new Date(currentTime);
    lateTime.setHours(23, 59, 0, 0);
    jasmine.clock().mockDate(lateTime);

    const taskAtMidnight = createMockTask({
      id: 'MIDNIGHT_TASK',
      title: 'Task at midnight',
      dueWithTime: todayAt(23, 59),
      tagIds: ['TODAY'],
    });

    const tasksWithMidnight = [...mockAllTasks, taskAtMidnight];
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(tasksWithMidnight),
      [
        ...mockAllTasks.filter((t) => t.tagIds.includes('TODAY')).map((t) => t.id),
        'MIDNIGHT_TASK',
      ],
    );

    const taskIds = result.map((t) => t.id);
    expect(taskIds).toContain('MIDNIGHT_TASK');
  });

  it('should return empty array when no tasks match criteria', () => {
    const noMatchingTasks: Task[] = [
      createMockTask({
        id: 'PAST_TASK',
        dueWithTime: todayAt(8, 0),
        tagIds: ['TODAY'],
      }),
      createMockTask({
        id: 'TOMORROW_TASK_2',
        dueWithTime: new Date(tomorrow).getTime(),
        tagIds: ['TODAY'],
      }),
    ];

    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(noMatchingTasks),
      ['PAST_TASK', 'TOMORROW_TASK_2'],
    );

    expect(result.length).toBe(0);
  });

  it('should return empty array when TODAY tag is null', () => {
    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockAllTasks),
      null as any,
    );

    expect(result.length).toBe(0);
  });

  it('should include parent task when only subtask is scheduled for later', () => {
    const parentWithScheduledSubtask = createMockTask({
      id: 'PARENT_UNSCHEDULED',
      title: 'Parent without schedule',
      dueWithTime: undefined,
      tagIds: ['TODAY'],
      subTaskIds: ['SUB_SCHEDULED'],
    });

    const scheduledSubtask = createMockTask({
      id: 'SUB_SCHEDULED',
      title: 'Subtask scheduled for later',
      dueWithTime: todayAt(15, 0),
      parentId: 'PARENT_UNSCHEDULED',
      tagIds: ['TODAY'],
    });

    const mockTasks = [parentWithScheduledSubtask, scheduledSubtask];
    const todayTaskIds = mockTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);

    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockTasks),
      todayTaskIds,
    );

    // Should include parent and subtask
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('PARENT_UNSCHEDULED');
    expect(result[1].id).toBe('SUB_SCHEDULED');
  });

  it('should sort by earliest scheduled time (parent or subtask)', () => {
    // Parent scheduled at 4 PM with subtask at 2 PM
    const parent1 = createMockTask({
      id: 'PARENT_1',
      title: 'Parent 1',
      dueWithTime: todayAt(16, 0),
      tagIds: ['TODAY'],
      subTaskIds: ['SUB_1_1'],
    });

    const sub1 = createMockTask({
      id: 'SUB_1_1',
      title: 'Subtask 1-1',
      dueWithTime: todayAt(14, 0),
      parentId: 'PARENT_1',
      tagIds: ['TODAY'],
    });

    // Parent unscheduled with subtask at 3 PM
    const parent2 = createMockTask({
      id: 'PARENT_2',
      title: 'Parent 2',
      dueWithTime: undefined,
      tagIds: ['TODAY'],
      subTaskIds: ['SUB_2_1'],
    });

    const sub2 = createMockTask({
      id: 'SUB_2_1',
      title: 'Subtask 2-1',
      dueWithTime: todayAt(15, 0),
      parentId: 'PARENT_2',
      tagIds: ['TODAY'],
    });

    const mockTasks = [parent1, sub1, parent2, sub2];
    const todayTaskIds = mockTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);

    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockTasks),
      todayTaskIds,
    );

    // Should be sorted by earliest time: Parent 1 (has subtask at 2 PM), then Parent 2 (has subtask at 3 PM)
    expect(result[0].id).toBe('PARENT_1'); // Earliest is subtask at 2 PM
    expect(result[1].id).toBe('SUB_1_1');
    expect(result[2].id).toBe('PARENT_2'); // Next is subtask at 3 PM
    expect(result[3].id).toBe('SUB_2_1');
  });

  it('should not include parent task if neither parent nor subtasks are scheduled for later', () => {
    const parentUnscheduled = createMockTask({
      id: 'PARENT_NO_SCHEDULE',
      title: 'Parent without schedule',
      dueWithTime: undefined,
      tagIds: ['TODAY'],
      subTaskIds: ['SUB_NO_SCHEDULE', 'SUB_PAST'],
    });

    const subUnscheduled = createMockTask({
      id: 'SUB_NO_SCHEDULE',
      title: 'Subtask without schedule',
      dueWithTime: undefined,
      parentId: 'PARENT_NO_SCHEDULE',
      tagIds: ['TODAY'],
    });

    const subPast = createMockTask({
      id: 'SUB_PAST',
      title: 'Subtask in past',
      dueWithTime: todayAt(8, 0),
      parentId: 'PARENT_NO_SCHEDULE',
      tagIds: ['TODAY'],
    });

    const mockTasks = [parentUnscheduled, subUnscheduled, subPast];
    const todayTaskIds = mockTasks
      .filter((t) => t.tagIds.includes('TODAY'))
      .map((t) => t.id);

    const result = selectLaterTodayTasksWithSubTasks.projector(
      createTaskState(mockTasks),
      todayTaskIds,
    );

    // Should not include any tasks
    expect(result.length).toBe(0);
  });
});
