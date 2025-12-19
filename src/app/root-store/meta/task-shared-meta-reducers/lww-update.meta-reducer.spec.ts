import { Action } from '@ngrx/store';
import { lwwUpdateMetaReducer } from './lww-update.meta-reducer';
import { RootState } from '../../root-state';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../../../features/tag/store/tag.reducer';
import { Task } from '../../../features/tasks/task.model';
import { Project } from '../../../features/project/project.model';
import { Tag } from '../../../features/tag/tag.model';

describe('lwwUpdateMetaReducer', () => {
  const mockReducer = jasmine.createSpy('reducer');
  const reducer = lwwUpdateMetaReducer(mockReducer);

  const TASK_ID = 'task1';
  const PROJECT_ID = 'project1';
  const TAG_ID = 'tag1';

  const createMockTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: TASK_ID,
      title: 'Original Title',
      notes: '',
      timeEstimate: 0,
      timeSpent: 0,
      timeSpentOnDay: {},
      reminderId: null,
      plannedAt: null,
      dueDay: null,
      dueWithTime: null,
      projectId: null,
      issueId: null,
      issueProviderId: null,
      issueType: null,
      issueLastUpdated: null,
      issuePoints: null,
      issueAttachmentNr: null,
      issueWasUpdated: false,
      issueTimeTracked: null,
      issueLinkType: null,
      tagIds: [],
      parentId: null,
      subTaskIds: [],
      attachmentIds: [],
      done: false,
      doneOn: null,
      modified: 1000,
      created: 1000,
      repeatCfgId: null,
      issueData: null,
      isDone: false,
      _showSubTasksMode: 2,
      ...overrides,
    }) as Task;

  const createMockProject = (overrides: Partial<Project> = {}): Project =>
    ({
      id: PROJECT_ID,
      title: 'Original Project',
      taskIds: [],
      backlogTaskIds: [],
      noteIds: [],
      isHiddenFromMenu: false,
      isArchived: false,
      isEnableBacklog: false,
      issueIntegrationCfgs: {},
      theme: {},
      ...overrides,
    }) as Project;

  const createMockTag = (overrides: Partial<Tag> = {}): Tag =>
    ({
      id: TAG_ID,
      title: 'Original Tag',
      taskIds: [],
      color: '#ff0000',
      icon: null,
      ...overrides,
    }) as Tag;

  const createMockState = (taskOverrides?: Partial<Task>[]): Partial<RootState> =>
    ({
      [TASK_FEATURE_NAME]: {
        ids: [TASK_ID],
        entities: {
          [TASK_ID]: createMockTask(taskOverrides?.[0]),
        },
        currentTaskId: null,
        selectedTaskId: null,
        taskDetailTargetPanel: null,
        isDataLoaded: true,
        lastCurrentTaskId: null,
      },
      [PROJECT_FEATURE_NAME]: {
        ids: [PROJECT_ID],
        entities: {
          [PROJECT_ID]: createMockProject(),
        },
      },
      [TAG_FEATURE_NAME]: {
        ids: [TAG_ID],
        entities: {
          [TAG_ID]: createMockTag(),
        },
      },
    }) as Partial<RootState>;

  beforeEach(() => {
    mockReducer.calls.reset();
    mockReducer.and.callFake((state: unknown, _action: Action) => state);
  });

  describe('non-LWW Update actions', () => {
    it('should pass through non-LWW Update actions unchanged', () => {
      const state = createMockState();
      const action = { type: '[Task] Update Task', task: { id: TASK_ID, changes: {} } };

      reducer(state, action);

      expect(mockReducer).toHaveBeenCalledWith(state, action);
    });

    it('should pass through actions with similar but non-matching types', () => {
      const state = createMockState();
      const action = { type: '[TASK] Some Other Action' };

      reducer(state, action);

      expect(mockReducer).toHaveBeenCalledWith(state, action);
    });
  });

  describe('[TASK] LWW Update', () => {
    it('should update task entity with LWW winning state', () => {
      const state = createMockState();
      const action = {
        type: '[TASK] LWW Update',
        id: TASK_ID,
        title: 'LWW Winning Title',
        notes: 'Updated notes',
        meta: {
          isPersistent: true,
          entityType: 'TASK',
          entityId: TASK_ID,
          isRemote: true,
        },
      };

      reducer(state, action);

      expect(mockReducer).toHaveBeenCalled();
      const updatedState = mockReducer.calls.mostRecent().args[0] as Partial<RootState>;
      const updatedTask = updatedState[TASK_FEATURE_NAME]?.entities[TASK_ID] as Task;
      expect(updatedTask.title).toBe('LWW Winning Title');
      expect(updatedTask.notes).toBe('Updated notes');
    });

    it('should update modified timestamp', () => {
      const state = createMockState([{ modified: 1000 }]);
      const action = {
        type: '[TASK] LWW Update',
        id: TASK_ID,
        title: 'Updated Title',
        modified: 1000, // Original timestamp in action
        meta: {
          isPersistent: true,
          entityType: 'TASK',
          entityId: TASK_ID,
          isRemote: true,
        },
      };

      const beforeTime = Date.now();
      reducer(state, action);
      const afterTime = Date.now();

      const updatedState = mockReducer.calls.mostRecent().args[0] as Partial<RootState>;
      const updatedTask = updatedState[TASK_FEATURE_NAME]?.entities[TASK_ID] as Task;
      expect(updatedTask.modified).toBeGreaterThanOrEqual(beforeTime);
      expect(updatedTask.modified).toBeLessThanOrEqual(afterTime);
    });

    it('should recreate entity if it does not exist (LWW update won over delete)', () => {
      const state = createMockState();
      const action = {
        type: '[TASK] LWW Update',
        id: 'recreated-task',
        title: 'Recreated Task Title',
        notes: 'This task was deleted locally but update won via LWW',
        isDone: true,
        doneOn: 12345,
        meta: { isPersistent: true, entityType: 'TASK', entityId: 'recreated-task' },
      };

      spyOn(console, 'log');
      reducer(state, action);

      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringMatching(
          /Entity TASK:recreated-task not found, recreating from LWW update/,
        ),
      );
      expect(mockReducer).toHaveBeenCalled();
      const updatedState = mockReducer.calls.mostRecent().args[0] as Partial<RootState>;
      const recreatedTask = updatedState[TASK_FEATURE_NAME]?.entities[
        'recreated-task'
      ] as Task;
      expect(recreatedTask).toBeDefined();
      expect(recreatedTask.id).toBe('recreated-task');
      expect(recreatedTask.title).toBe('Recreated Task Title');
      expect(recreatedTask.notes).toBe(
        'This task was deleted locally but update won via LWW',
      );
      expect(recreatedTask.isDone).toBe(true);
      expect(recreatedTask.doneOn).toBe(12345);
    });

    it('should add recreated entity to the ids array', () => {
      const state = createMockState();
      const action = {
        type: '[TASK] LWW Update',
        id: 'new-task-from-lww',
        title: 'New Task',
        meta: { isPersistent: true, entityType: 'TASK', entityId: 'new-task-from-lww' },
      };

      reducer(state, action);

      const updatedState = mockReducer.calls.mostRecent().args[0] as Partial<RootState>;
      expect(updatedState[TASK_FEATURE_NAME]?.ids).toContain('new-task-from-lww');
    });

    it('should skip update if action has no id', () => {
      const state = createMockState();
      const action = {
        type: '[TASK] LWW Update',
        title: 'Updated Title',
        meta: { isPersistent: true, entityType: 'TASK' },
      };

      spyOn(console, 'warn');
      reducer(state, action);

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/Entity data has no id/),
      );
      expect(mockReducer).toHaveBeenCalledWith(state, action);
    });
  });

  describe('[PROJECT] LWW Update', () => {
    it('should update project entity with LWW winning state', () => {
      const state = createMockState();
      const action = {
        type: '[PROJECT] LWW Update',
        id: PROJECT_ID,
        title: 'LWW Winning Project Title',
        meta: {
          isPersistent: true,
          entityType: 'PROJECT',
          entityId: PROJECT_ID,
          isRemote: true,
        },
      };

      reducer(state, action);

      expect(mockReducer).toHaveBeenCalled();
      const updatedState = mockReducer.calls.mostRecent().args[0] as Partial<RootState>;
      const updatedProject = updatedState[PROJECT_FEATURE_NAME]?.entities[
        PROJECT_ID
      ] as Project;
      expect(updatedProject.title).toBe('LWW Winning Project Title');
    });
  });

  describe('[TAG] LWW Update', () => {
    it('should update tag entity with LWW winning state', () => {
      const state = createMockState();
      const action = {
        type: '[TAG] LWW Update',
        id: TAG_ID,
        title: 'LWW Winning Tag Title',
        color: '#00ff00',
        meta: {
          isPersistent: true,
          entityType: 'TAG',
          entityId: TAG_ID,
          isRemote: true,
        },
      };

      reducer(state, action);

      expect(mockReducer).toHaveBeenCalled();
      const updatedState = mockReducer.calls.mostRecent().args[0] as Partial<RootState>;
      const updatedTag = updatedState[TAG_FEATURE_NAME]?.entities[TAG_ID] as Tag;
      expect(updatedTag.title).toBe('LWW Winning Tag Title');
      expect(updatedTag.color).toBe('#00ff00');
    });
  });

  describe('unknown entity types', () => {
    it('should warn and pass through for unknown entity types', () => {
      const state = createMockState();
      const action = {
        type: '[UNKNOWN_ENTITY] LWW Update',
        id: 'unknown-1',
        title: 'Updated Title',
        meta: { isPersistent: true, entityType: 'UNKNOWN_ENTITY', entityId: 'unknown-1' },
      };

      spyOn(console, 'warn');
      reducer(state, action);

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/Unknown entity type: UNKNOWN_ENTITY/),
      );
      expect(mockReducer).toHaveBeenCalledWith(state, action);
    });
  });

  describe('null/undefined state', () => {
    it('should pass through if state is undefined', () => {
      const action = { type: '[TASK] LWW Update', id: TASK_ID };

      reducer(undefined, action);

      expect(mockReducer).toHaveBeenCalledWith(undefined, action);
    });
  });
});
