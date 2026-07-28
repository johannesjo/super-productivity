import { INBOX_PROJECT } from '../../../features/project/project.const';
import { Project } from '../../../features/project/project.model';
import { Task } from '../../../features/tasks/task.model';
import { createAppDataCompleteMock } from '../../../util/app-data-mock';
import { dataRepair } from '../../validation/data-repair';
import { createValidTask } from '../../validation/state-validity-test-utils';
import { validateFull } from '../../validation/validation-fn';
import { AppDataComplete } from '../../model/model-config';

describe('task project-membership repair (#8780) — integration', () => {
  const makeState = (task: Task): AppDataComplete => {
    const state = createAppDataCompleteMock();
    const inbox: Project = {
      ...INBOX_PROJECT,
      taskIds: [],
      backlogTaskIds: [],
    };
    state.project = {
      ids: [inbox.id],
      entities: { [inbox.id]: inbox },
    };
    state.task = {
      ...state.task,
      ids: [task.id],
      entities: { [task.id]: task },
    };
    return state;
  };

  const repairAndExpectValid = (state: AppDataComplete): AppDataComplete => {
    expect(validateFull(state).isValid).toBe(false);

    const repaired = dataRepair(state).data;

    expect(validateFull(repaired).isValid).toBe(true);
    return repaired;
  };

  it('restores a top-level task missing from its owning project lists', () => {
    const task = createValidTask('unlisted-task', {
      projectId: INBOX_PROJECT.id,
    });

    const repaired = repairAndExpectValid(makeState(task));

    expect(repaired.project.entities[INBOX_PROJECT.id]!.taskIds).toContain(task.id);
  });

  it('re-homes a task with a dangling project reference into the Inbox list', () => {
    const task = createValidTask('dangling-project-task', {
      projectId: 'deleted-project',
    });

    const repaired = repairAndExpectValid(makeState(task));

    expect(repaired.task.entities[task.id]!.projectId).toBe(INBOX_PROJECT.id);
    expect(repaired.project.entities[INBOX_PROJECT.id]!.taskIds).toContain(task.id);
  });

  it('lists a missing-parent subtask after promoting it to a top-level task', () => {
    const task = createValidTask('missing-parent-task', {
      projectId: INBOX_PROJECT.id,
      parentId: 'deleted-parent',
    });

    const repaired = repairAndExpectValid(makeState(task));

    expect(repaired.task.entities[task.id]!.parentId).toBeUndefined();
    expect(repaired.project.entities[INBOX_PROJECT.id]!.taskIds).toContain(task.id);
  });
});
