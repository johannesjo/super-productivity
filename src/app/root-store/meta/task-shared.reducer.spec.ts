import { taskSharedMetaReducer } from './task-shared.reducer';
import {
  addTask,
  convertToMainTask,
  deleteTask,
} from '../../features/tasks/store/task.actions';
import { RootState } from '../root-state';
import { TASK_FEATURE_NAME } from '../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { ActionReducer, Action } from '@ngrx/store';
import { getWorklogStr } from '../../util/get-work-log-str';
import { WorklogGrouping } from '../../features/worklog/worklog.model';

describe('taskSharedMetaReducer', () => {
  let mockReducer: jasmine.Spy;
  let metaReducer: ActionReducer<RootState, Action>;
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
        worklogExportSettings: {
          cols: [],
          roundWorkTimeTo: null,
          roundStartTimeTo: null,
          roundEndTimeTo: null,
          separateTasksBy: '',
          groupBy: WorklogGrouping.DATE,
        },
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
        worklogExportSettings: {
          cols: [],
          roundWorkTimeTo: null,
          roundStartTimeTo: null,
          roundEndTimeTo: null,
          separateTasksBy: '',
          groupBy: WorklogGrouping.DATE,
        },
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
      },
    };
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

      metaReducer(initialState as RootState, action);

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

      metaReducer(initialState as RootState, action);

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

      metaReducer(initialState as RootState, action);

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
      const updatedInitialState = {
        ...initialState,
        [PROJECT_FEATURE_NAME]: {
          ...initialState[PROJECT_FEATURE_NAME]!,
          entities: {
            ...initialState[PROJECT_FEATURE_NAME]!.entities,
            project1: {
              ...(initialState[PROJECT_FEATURE_NAME]!.entities.project1 as Project),
              taskIds: ['existing-task'],
            },
          },
        },
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['existing-task'],
            },
          },
        },
      };

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

      metaReducer(updatedInitialState as RootState, action);

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

      metaReducer(initialState as RootState, action);

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

  describe('convertToMainTask action', () => {
    it('should add task to project taskIds', () => {
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

      const action = convertToMainTask({
        task: mockTask,
        parentTagIds: ['tag1'],
        isPlanForToday: false,
      });

      metaReducer(initialState as RootState, action);

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

    it('should add task to Today tag when isPlanForToday is true', () => {
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

      const action = convertToMainTask({
        task: mockTask,
        parentTagIds: ['tag1'],
        isPlanForToday: true,
      });

      metaReducer(initialState as RootState, action);

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

      const action = convertToMainTask({
        task: mockTask,
        parentTagIds: ['tag1'],
        isPlanForToday: false,
      });

      metaReducer(initialState as RootState, action);

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

    it('should add task at the beginning of existing taskIds', () => {
      // Setup existing task in project and tag
      const updatedInitialState = {
        ...initialState,
        [PROJECT_FEATURE_NAME]: {
          ...initialState[PROJECT_FEATURE_NAME]!,
          entities: {
            ...initialState[PROJECT_FEATURE_NAME]!.entities,
            project1: {
              ...(initialState[PROJECT_FEATURE_NAME]!.entities.project1 as Project),
              taskIds: ['existing-task'],
            },
          },
        },
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['existing-task'],
            },
          },
        },
      };

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

      const action = convertToMainTask({
        task: mockTask,
        parentTagIds: ['tag1'],
        isPlanForToday: false,
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: ['task1', 'existing-task'],
              }),
            }),
          }),
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['task1', 'existing-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });
  });

  describe('deleteTask action', () => {
    it('should remove task from project taskIds and backlogTaskIds', () => {
      // Setup task in both regular and backlog lists
      const updatedInitialState = {
        ...initialState,
        [PROJECT_FEATURE_NAME]: {
          ...initialState[PROJECT_FEATURE_NAME]!,
          entities: {
            ...initialState[PROJECT_FEATURE_NAME]!.entities,
            project1: {
              ...(initialState[PROJECT_FEATURE_NAME]!.entities.project1 as Project),
              taskIds: ['task1', 'other-task'],
              backlogTaskIds: ['task1', 'backlog-task'],
            },
          },
        },
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'other-task'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'today-task'],
            },
          },
        },
      };

      const mockTask: TaskWithSubTasks = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: 'project1',
        subTaskIds: [],
        subTasks: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = deleteTask({ task: mockTask });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: ['other-task'],
                backlogTaskIds: ['backlog-task'],
              }),
            }),
          }),
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['other-task'],
              }),
              TODAY: jasmine.objectContaining({
                taskIds: ['today-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle task with subtasks removal from tags', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'subtask1', 'other-task'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'subtask1', 'today-task'],
            },
          },
        },
      };

      const mockTask: TaskWithSubTasks = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: '',
        subTaskIds: ['subtask1'],
        subTasks: [
          {
            id: 'subtask1',
            tagIds: ['tag1'],
          } as Task,
        ],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = deleteTask({ task: mockTask });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['other-task'],
              }),
              TODAY: jasmine.objectContaining({
                taskIds: ['today-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should skip project update when task has no projectId', () => {
      const mockTask: TaskWithSubTasks = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: '',
        subTaskIds: [],
        subTasks: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = deleteTask({ task: mockTask });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: [],
              }),
              TODAY: jasmine.objectContaining({
                taskIds: [],
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
      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(initialState, action);
    });
  });
});
