/**
 * Characterizes the reducer consequences of retrying a captured addTask action.
 *
 * A deterministic task id prevents a duplicate entity while the original task
 * still exists. It does not make an action retry safe after later operations:
 * a stale add recreates a deleted task and can restore an old project-list
 * membership after the task has moved. A capture queue therefore needs action
 * identity/deduplication plus ordering or supersession semantics; task id alone
 * is not an idempotency key for arbitrary retries.
 *
 * This deliberately characterizes the older local-add/retry path only. It does
 * not model or validate the prepare/publication protocol proposed in
 * docs/plans/2026-09-17-agent-capture-stage-a.md.
 */
import { Action, ActionReducer } from '@ngrx/store';
import { RootState } from '../../root-state';
import { TaskSharedActions } from '../task-shared.actions';
import { sectionSharedMetaReducer } from './section-shared.reducer';
import { taskSharedCrudMetaReducer } from './task-shared-crud.reducer';
import { createBaseState, createMockProject, createMockTask } from './test-utils';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import { SECTION_FEATURE_NAME } from '../../../features/section/store/section.reducer';
import { Task, TaskWithSubTasks } from '../../../features/tasks/task.model';
import { Project } from '../../../features/project/project.model';
import { WorkContextType } from '../../../features/work-context/work-context.model';

describe('capture retry replay characterization', () => {
  const TASK_ID = 'retry-task';
  const PROJECT_A = 'project1';
  const PROJECT_B = 'project-b';

  const passthrough: ActionReducer<RootState, Action> = (state) => {
    if (!state) {
      throw new Error('The retry fixture always supplies a hydrated state');
    }
    return state;
  };

  // This is the production order for the meta-reducers that handle these
  // actions. Section runs before CRUD because it reads the pre-CRUD task state.
  const reduce = sectionSharedMetaReducer(taskSharedCrudMetaReducer(passthrough));

  const createState = (): RootState => {
    const baseState = createBaseState();
    return {
      ...baseState,
      [SECTION_FEATURE_NAME]: { ids: [], entities: {} },
    } as RootState;
  };

  const createStateWithSecondProject = (): RootState => {
    const state = createState();
    const projectState = state[PROJECT_FEATURE_NAME];
    const projectB = createMockProject({
      id: PROJECT_B,
      taskIds: [],
      backlogTaskIds: [],
    });

    return {
      ...state,
      [PROJECT_FEATURE_NAME]: {
        ...projectState,
        ids: [...projectState.ids, PROJECT_B],
        entities: { ...projectState.entities, [PROJECT_B]: projectB },
      },
    } as RootState;
  };

  const createAddAction = (): ReturnType<typeof TaskSharedActions.addTask> =>
    TaskSharedActions.addTask({
      task: createMockTask({
        id: TASK_ID,
        title: 'Captured title',
        projectId: PROJECT_A,
        tagIds: ['tag1'],
      }),
      workContextId: PROJECT_A,
      workContextType: WorkContextType.PROJECT,
      isAddToBacklog: false,
      isAddToBottom: false,
    });

  const task = (state: RootState): Task | undefined =>
    state[TASK_FEATURE_NAME].entities[TASK_ID] as Task | undefined;

  const projectTaskIds = (state: RootState, projectId: string): string[] =>
    (state[PROJECT_FEATURE_NAME].entities[projectId] as Project).taskIds;

  it('does not duplicate the entity or its original project membership for the same add', () => {
    const add = createAddAction();
    const afterFirstAdd = reduce(createState(), add);
    const afterRetry = reduce(afterFirstAdd, add);

    expect(afterRetry[TASK_FEATURE_NAME].ids).toEqual([TASK_ID]);
    expect(task(afterRetry)?.title).toBe('Captured title');
    expect(projectTaskIds(afterRetry, PROJECT_A)).toEqual([TASK_ID]);
  });

  it('preserves a later edit when the original add is replayed', () => {
    const add = createAddAction();
    const afterAdd = reduce(createState(), add);
    const afterEdit = reduce(
      afterAdd,
      TaskSharedActions.updateTask({
        task: { id: TASK_ID, changes: { title: 'Edited after capture' } },
      }),
    );
    const afterRetry = reduce(afterEdit, add);

    expect(task(afterRetry)?.title).toBe('Edited after capture');
    expect(projectTaskIds(afterRetry, PROJECT_A)).toEqual([TASK_ID]);
  });

  it('recreates the task when a stale add is retried after deletion', () => {
    const add = createAddAction();
    const afterAdd = reduce(createState(), add);
    const deleteAction = TaskSharedActions.deleteTask({
      task: { ...task(afterAdd), subTasks: [] } as TaskWithSubTasks,
    });
    const afterDelete = reduce(afterAdd, deleteAction);
    const afterRetry = reduce(afterDelete, add);

    expect(task(afterDelete)).toBeUndefined();
    expect(task(afterRetry)?.title).toBe('Captured title');
    expect(projectTaskIds(afterRetry, PROJECT_A)).toEqual([TASK_ID]);
  });

  it('restores the captured project membership after a later project move', () => {
    const add = createAddAction();
    const afterAdd = reduce(createStateWithSecondProject(), add);
    const afterMove = reduce(
      afterAdd,
      TaskSharedActions.updateTask({
        task: { id: TASK_ID, changes: { projectId: PROJECT_B } },
      }),
    );
    const afterRetry = reduce(afterMove, add);

    expect(task(afterRetry)?.projectId).toBe(PROJECT_B);
    expect(projectTaskIds(afterRetry, PROJECT_A)).toEqual([TASK_ID]);
    expect(projectTaskIds(afterRetry, PROJECT_B)).toEqual([TASK_ID]);
  });
});
