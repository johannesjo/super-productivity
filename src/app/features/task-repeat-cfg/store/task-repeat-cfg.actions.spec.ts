import {
  addTaskRepeatCfgToTask,
  updateTaskRepeatCfg,
  updateTaskRepeatCfgs,
  deleteTaskRepeatCfg,
} from './task-repeat-cfg.actions';
import { TaskRepeatCfg } from '../task-repeat-cfg.model';
import { DEFAULT_TASK_REPEAT_CFG } from '../task-repeat-cfg.model';

describe('TaskRepeatCfg Actions', () => {
  const mockTaskId = 'testTaskId';
  const mockTaskRepeatCfg: TaskRepeatCfg = {
    ...DEFAULT_TASK_REPEAT_CFG,
    id: 'testRepeatCfgId',
    title: 'Test Repeatable Task',
    tagIds: [],
    subTasks: [
      {
        title: 'Test Subtask',
        notes: 'Test Notes',
        timeEstimate: 1000,
      },
    ],
  };

  it('should create addTaskRepeatCfgToTask action', () => {
    const action = addTaskRepeatCfgToTask({
      taskId: mockTaskId,
      taskRepeatCfg: mockTaskRepeatCfg,
    });

    expect(action.type).toBe('[TaskRepeatCfg][Task] Add TaskRepeatCfg to Task');
    expect(action.taskId).toBe(mockTaskId);
    expect(action.taskRepeatCfg).toBe(mockTaskRepeatCfg);
  });

  it('should create updateTaskRepeatCfg action', () => {
    const changes = { title: 'Updated Title' };
    const action = updateTaskRepeatCfg({
      taskRepeatCfg: {
        id: mockTaskRepeatCfg.id,
        changes,
      },
      isAskToUpdateAllTaskInstances: true,
    });

    expect(action.type).toBe('[TaskRepeatCfg] Update TaskRepeatCfg');
    expect(action.taskRepeatCfg.id).toBe(mockTaskRepeatCfg.id);
    expect(action.taskRepeatCfg.changes).toEqual(changes);
    expect(action.isAskToUpdateAllTaskInstances).toBe(true);
  });

  it('should create deleteTaskRepeatCfg action', () => {
    const action = deleteTaskRepeatCfg({ id: mockTaskRepeatCfg.id });

    expect(action.type).toBe('[TaskRepeatCfg] Delete TaskRepeatCfg');
    expect(action.id).toBe(mockTaskRepeatCfg.id);
  });

  it('should create updateTaskRepeatCfgs action to update multiple configs', () => {
    const ids = [mockTaskRepeatCfg.id];
    const changes = { isPaused: true };
    const action = updateTaskRepeatCfgs({ ids, changes });

    expect(action.type).toBe('[TaskRepeatCfg] Update multiple TaskRepeatCfgs');
    expect(action.ids).toEqual(ids);
    expect(action.changes).toEqual(changes);
  });
});
