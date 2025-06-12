import { taskSharedMetaReducer } from './task-shared.reducer';
import { addTask } from '../../features/tasks/store/task.actions';
import { RootState } from '../root-state';
import { TASK_FEATURE_NAME } from '../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { Task } from '../../features/tasks/task.model';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { getWorklogStr } from '../../util/get-work-log-str';

describe('taskSharedMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: any;
  let initialState: Partial<RootState>;

  beforeEach(() => {
    mockReducer = jasmine.createSpy('reducer').and.callFake((state, action) => state);
    metaReducer = taskSharedMetaReducer(mockReducer);

    const mockProject: Project = {
      id: 'project1',
      title: 'Test Project',
      isArchived: false,
      isHiddenFromMenu: false,
      isEnableBacklog: true,
      taskIds: [],
      backlogTaskIds: [],
      noteIds: [],
      advancedCfg: {
        worklogExportSettings: {} as any,
      },
      theme: {
        primary: '#000000',
      },
      icon: null,
    };

    const mockTag: Tag = {
      id: 'tag1',
      title: 'Test Tag',
      color: '#000000',
      created: Date.now(),
      taskIds: [],
      advancedCfg: {
        worklogExportSettings: {} as any,
      },
      theme: {
        primary: '#000000',
      },
    };

    initialState = {
      [TASK_FEATURE_NAME]: {
        ids: [],
        entities: {},
        currentTaskId: null,
        selectedTaskId: null,
        taskDetailTargetPanel: null,
        lastCurrentTaskId: null,
        isDataLoaded: false,
      },
      [TAG_FEATURE_NAME]: {
        ids: ['tag1', 'TODAY'],
        entities: {
          tag1: mockTag,
          TODAY: {
            ...mockTag,
            id: 'TODAY',
            title: 'Today',
            taskIds: [],
          },
        },
      },
      [PROJECT_FEATURE_NAME]: {
        ids: ['project1'],
        entities: { project1: mockProject },
        currentId: null,
      },
    } as any;
  });

  describe('addTask action', () => {
    it('should add task to project taskIds when not adding to backlog', () => {
      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: 'project1',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = addTask({
        task: mockTask,
        workContextId: 'project1',
        workContextType: WorkContextType.PROJECT,
        isAddToBottom: false,
        isAddToBacklog: false,
      });

      metaReducer(initialState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should add task to project backlogTaskIds when adding to backlog', () => {
      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: 'project1',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = addTask({
        task: mockTask,
        workContextId: 'project1',
        workContextType: WorkContextType.PROJECT,
        isAddToBottom: false,
        isAddToBacklog: true,
      });

      metaReducer(initialState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                backlogTaskIds: ['task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should add task to Today tag when due today', () => {
      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: 'project1',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        dueDay: getWorklogStr(),
        attachments: [],
      };

      const action = addTask({
        task: mockTask,
        workContextId: 'project1',
        workContextType: WorkContextType.PROJECT,
        isAddToBottom: false,
        isAddToBacklog: false,
      });

      metaReducer(initialState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
              tag1: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should add task to bottom when isAddToBottom is true', () => {
      // Setup existing task in project
      (initialState[PROJECT_FEATURE_NAME] as any).entities.project1.taskIds = [
        'existing-task',
      ];
      (initialState[TAG_FEATURE_NAME] as any).entities.tag1.taskIds = ['existing-task'];

      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: 'project1',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = addTask({
        task: mockTask,
        workContextId: 'project1',
        workContextType: WorkContextType.PROJECT,
        isAddToBottom: true,
        isAddToBacklog: false,
      });

      metaReducer(initialState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: ['existing-task', 'task1'],
              }),
            }),
          }),
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['existing-task', 'task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should skip project update when task has no projectId', () => {
      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: '',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = addTask({
        task: mockTask,
        workContextId: 'project1',
        workContextType: WorkContextType.PROJECT,
        isAddToBottom: false,
        isAddToBacklog: false,
      });

      metaReducer(initialState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });
  });

  describe('other actions', () => {
    it('should pass through other actions to the reducer', () => {
      const action = { type: 'SOME_OTHER_ACTION' };
      metaReducer(initialState, action);

      expect(mockReducer).toHaveBeenCalledWith(initialState, action);
      expect(result).toBe(initialState);
    });
  });
});
