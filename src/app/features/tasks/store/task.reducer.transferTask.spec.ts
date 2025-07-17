/* eslint-disable @typescript-eslint/naming-convention,@typescript-eslint/explicit-function-return-type */
import { Task, TaskState } from '../task.model';
import { initialTaskState, taskReducer } from './task.reducer';
import { PlannerActions } from '../../planner/store/planner.actions';
import { DEFAULT_TASK } from '../task.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

describe('Task Reducer - transferTask action', () => {
  const createTask = (id: string, partial: Partial<Task> = {}): Task => ({
    ...DEFAULT_TASK,
    id,
    title: `Task ${id}`,
    created: Date.now(),
    isDone: false,
    subTaskIds: [],
    tagIds: [],
    projectId: 'project1',
    parentId: undefined,
    timeSpentOnDay: {},
    timeEstimate: 0,
    timeSpent: 0,
    dueDay: undefined,
    dueWithTime: undefined,
    attachments: [],
    ...partial,
  });

  const createTransferTaskAction = (
    task: Task,
    prevDay: string,
    newDay: string,
    targetIndex: number = 0,
    today: string = getWorklogStr(),
    targetTaskId?: string,
  ) =>
    PlannerActions.transferTask({
      task,
      prevDay,
      newDay,
      targetIndex,
      today,
      targetTaskId,
    });

  let stateWithTasks: TaskState;

  beforeEach(() => {
    // Create initial state with some tasks
    stateWithTasks = {
      ...initialTaskState,
      ids: ['task1', 'task2', 'task3'],
      entities: {
        task1: createTask('task1', { dueDay: '2025-01-15', dueWithTime: 1234567890 }),
        task2: createTask('task2', { dueDay: '2025-01-16' }),
        task3: createTask('task3', { dueDay: undefined }),
      },
      currentTaskId: null,
      selectedTaskId: null,
      taskDetailTargetPanel: null,
      lastCurrentTaskId: null,
      isDataLoaded: true,
    };
  });

  it('should update task dueDay to newDay', () => {
    const task = stateWithTasks.entities.task1 as Task;
    const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17');

    const result = taskReducer(stateWithTasks, action);

    expect(result.entities.task1).toEqual({
      ...task,
      dueDay: '2025-01-17',
      dueWithTime: undefined,
    });
  });

  it('should clear dueWithTime when transferring task', () => {
    const task = stateWithTasks.entities.task1 as Task;
    expect(task.dueWithTime).toBe(1234567890); // Verify it has a dueWithTime initially

    const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17');
    const result = taskReducer(stateWithTasks, action);

    expect(result.entities.task1?.dueWithTime).toBeUndefined();
  });

  it('should handle transferring task with no previous dueDay', () => {
    const task = stateWithTasks.entities.task3 as Task;
    expect(task.dueDay).toBeUndefined(); // Verify it has no dueDay initially

    const action = createTransferTaskAction(task, 'ADD_TASK_PANEL_ID', '2025-01-18');
    const result = taskReducer(stateWithTasks, action);

    expect(result.entities.task3).toEqual({
      ...task,
      dueDay: '2025-01-18',
      dueWithTime: undefined,
    });
  });

  it('should handle transferring task to ADD_TASK_PANEL_ID', () => {
    const task = stateWithTasks.entities.task2 as Task;
    const action = createTransferTaskAction(task, '2025-01-16', 'ADD_TASK_PANEL_ID');

    const result = taskReducer(stateWithTasks, action);

    expect(result.entities.task2).toEqual({
      ...task,
      dueDay: 'ADD_TASK_PANEL_ID',
      dueWithTime: undefined,
    });
  });

  it('should handle transferring task to today', () => {
    const today = getWorklogStr();
    const task = stateWithTasks.entities.task1 as Task;
    const action = createTransferTaskAction(task, '2025-01-15', today);

    const result = taskReducer(stateWithTasks, action);

    expect(result.entities.task1).toEqual({
      ...task,
      dueDay: today,
      dueWithTime: undefined,
    });
  });

  it('should not affect other tasks when transferring', () => {
    const task = stateWithTasks.entities.task1 as Task;
    const action = createTransferTaskAction(task, '2025-01-15', '2025-01-17');

    const result = taskReducer(stateWithTasks, action);

    // Other tasks should remain unchanged
    expect(result.entities.task2).toEqual(stateWithTasks.entities.task2);
    expect(result.entities.task3).toEqual(stateWithTasks.entities.task3);
  });

  it('should handle transferring with targetTaskId parameter', () => {
    const task = stateWithTasks.entities.task1 as Task;
    const action = createTransferTaskAction(
      task,
      '2025-01-15',
      '2025-01-17',
      2,
      getWorklogStr(),
      'task2',
    );

    const result = taskReducer(stateWithTasks, action);

    // Should still update dueDay regardless of targetTaskId
    expect(result.entities.task1).toEqual({
      ...task,
      dueDay: '2025-01-17',
      dueWithTime: undefined,
    });
  });

  it('should maintain other task properties when updating', () => {
    const task = createTask('task4', {
      dueDay: '2025-01-15',
      dueWithTime: 1234567890,
      timeSpent: 3600000,
      timeEstimate: 7200000,
      tagIds: ['tag1', 'tag2'],
      isDone: true,
      attachments: [{ id: 'att1', title: 'attachment', type: 'FILE' as const }],
    });

    const stateWithComplexTask: TaskState = {
      ...initialTaskState,
      ids: ['task4'],
      entities: { task4: task },
    };

    const action = createTransferTaskAction(task, '2025-01-15', '2025-01-20');
    const result = taskReducer(stateWithComplexTask, action);

    expect(result.entities.task4).toEqual({
      ...task,
      dueDay: '2025-01-20',
      dueWithTime: undefined,
      // All other properties should remain unchanged
      timeSpent: 3600000,
      timeEstimate: 7200000,
      tagIds: ['tag1', 'tag2'],
      isDone: true,
      attachments: [{ id: 'att1', title: 'attachment', type: 'FILE' as const }],
    });
  });

  it('should handle transferring to the same day', () => {
    const task = stateWithTasks.entities.task1 as Task;
    const action = createTransferTaskAction(task, '2025-01-15', '2025-01-15');

    const result = taskReducer(stateWithTasks, action);

    // Should still update (clear dueWithTime)
    expect(result.entities.task1).toEqual({
      ...task,
      dueDay: '2025-01-15',
      dueWithTime: undefined,
    });
  });
});
