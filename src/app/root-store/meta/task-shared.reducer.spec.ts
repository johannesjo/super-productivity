import { taskSharedMetaReducer } from './task-shared.reducer';
import {
  addTask,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveToArchive_,
  restoreTask,
  scheduleTaskWithTime,
  unScheduleTask,
  updateTaskTags,
} from '../../features/tasks/store/task.actions';
import { deleteProject } from '../../features/project/store/project.actions';
import {
  planTasksForToday,
  removeTasksFromTodayTag,
} from '../../features/tag/store/tag.actions';
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

  describe('deleteTasks action', () => {
    it('should remove multiple task IDs from all tags', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'task2', 'other-task'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'task3', 'today-task'],
            },
          },
        },
      };

      const action = deleteTasks({ taskIds: ['task1', 'task2', 'task3'] });

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

    it('should handle empty taskIds array', () => {
      const action = deleteTasks({ taskIds: [] });

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

    it('should not affect taskIds that are not in the deletion list', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['keep-task1', 'delete-task', 'keep-task2'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['keep-task3', 'delete-task', 'keep-task4'],
            },
          },
        },
      };

      const action = deleteTasks({ taskIds: ['delete-task', 'nonexistent-task'] });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['keep-task1', 'keep-task2'],
              }),
              TODAY: jasmine.objectContaining({
                taskIds: ['keep-task3', 'keep-task4'],
              }),
            }),
          }),
        }),
        action,
      );
    });
  });

  describe('moveToArchive_ action', () => {
    it('should remove tasks from project taskIds and backlogTaskIds', () => {
      const updatedInitialState = {
        ...initialState,
        [PROJECT_FEATURE_NAME]: {
          ...initialState[PROJECT_FEATURE_NAME]!,
          entities: {
            ...initialState[PROJECT_FEATURE_NAME]!.entities,
            project1: {
              ...(initialState[PROJECT_FEATURE_NAME]!.entities.project1 as Project),
              taskIds: ['task1', 'task2', 'keep-task'],
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
              taskIds: ['task1', 'subtask1', 'keep-task'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'subtask1', 'today-task'],
            },
          },
        },
      };

      const tasksToArchive: TaskWithSubTasks[] = [
        {
          id: 'task1',
          title: 'Task 1',
          created: Date.now(),
          isDone: false,
          tagIds: ['tag1'],
          projectId: 'project1',
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
        },
        {
          id: 'task2',
          title: 'Task 2',
          created: Date.now(),
          isDone: false,
          tagIds: [],
          projectId: 'project1',
          subTaskIds: [],
          subTasks: [],
          timeSpentOnDay: {},
          timeSpent: 0,
          timeEstimate: 0,
          attachments: [],
        },
      ];

      const action = moveToArchive_({ tasks: tasksToArchive });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: ['keep-task'],
                backlogTaskIds: ['backlog-task'],
              }),
            }),
          }),
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['keep-task'],
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

    it('should handle tasks without projects', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'keep-task'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'today-task'],
            },
          },
        },
      };

      const tasksToArchive: TaskWithSubTasks[] = [
        {
          id: 'task1',
          title: 'Task 1',
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
        },
      ];

      const action = moveToArchive_({ tasks: tasksToArchive });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['keep-task'],
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

    it('should handle empty tasks array', () => {
      const action = moveToArchive_({ tasks: [] });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [PROJECT_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              project1: jasmine.objectContaining({
                taskIds: [],
                backlogTaskIds: [],
              }),
            }),
          }),
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

  describe('restoreTask action', () => {
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

      const action = restoreTask({ task: mockTask, subTasks: [] });

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

    it('should handle task with subtasks', () => {
      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1'],
        projectId: 'project1',
        subTaskIds: ['subtask1'],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const mockSubTasks: Task[] = [
        {
          id: 'subtask1',
          title: 'Sub Task',
          created: Date.now(),
          isDone: false,
          tagIds: ['tag1'],
          projectId: 'project1',
          subTaskIds: [],
          timeSpentOnDay: {},
          timeSpent: 0,
          timeEstimate: 0,
          attachments: [],
        },
      ];

      const action = restoreTask({ task: mockTask, subTasks: mockSubTasks });

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
                taskIds: ['task1', 'subtask1'],
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

      const action = restoreTask({ task: mockTask, subTasks: [] });

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

    it('should add tasks to existing taskIds', () => {
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

      const action = restoreTask({ task: mockTask, subTasks: [] });

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

    it('should skip tags that do not exist', () => {
      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1', 'nonexistent-tag'],
        projectId: 'project1',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = restoreTask({ task: mockTask, subTasks: [] });

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

  describe('scheduleTaskWithTime action', () => {
    it('should add task to Today tag when scheduled for today', () => {
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

      const todayTimestamp = Date.now();
      const action = scheduleTaskWithTime({
        task: mockTask,
        dueWithTime: todayTimestamp,
        isMoveToBacklog: false,
      });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should remove task from Today tag when scheduled for different day', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1'],
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

      const oneDayInMs = 24 * 60 * 60 * 1000;
      const tomorrowTimestamp = Date.now() + oneDayInMs;
      const action = scheduleTaskWithTime({
        task: mockTask,
        dueWithTime: tomorrowTimestamp,
        isMoveToBacklog: false,
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: [],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should not change state when task is already in Today and scheduled for today', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1'],
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

      const todayTimestamp = Date.now();
      const action = scheduleTaskWithTime({
        task: mockTask,
        dueWithTime: todayTimestamp,
        isMoveToBacklog: false,
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(updatedInitialState, action);
    });

    it('should not change state when task is not in Today and scheduled for different day', () => {
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

      const oneDayInMs = 24 * 60 * 60 * 1000;
      const tomorrowTimestamp = Date.now() + oneDayInMs;
      const action = scheduleTaskWithTime({
        task: mockTask,
        dueWithTime: tomorrowTimestamp,
        isMoveToBacklog: false,
      });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(initialState, action);
    });
  });

  describe('unScheduleTask action', () => {
    it('should remove task from Today tag when task is in Today', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'other-task'],
            },
          },
        },
      };

      const action = unScheduleTask({ id: 'task1' });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['other-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should not change state when task is not in Today tag', () => {
      const action = unScheduleTask({ id: 'task1' });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(initialState, action);
    });

    it('should handle empty Today tag taskIds', () => {
      const action = unScheduleTask({ id: 'task1' });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(initialState, action);
    });

    it('should remove only the specified task', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'task2', 'task3'],
            },
          },
        },
      };

      const action = unScheduleTask({ id: 'task2' });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1', 'task3'],
              }),
            }),
          }),
        }),
        action,
      );
    });
  });

  describe('updateTaskTags action', () => {
    it('should add task to new tags and remove from old tags', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'other-task'],
            },
            tag2: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              id: 'tag2',
              title: 'Tag 2',
              taskIds: [],
            },
          },
          ids: [...(initialState[TAG_FEATURE_NAME]!.ids as string[]), 'tag2'],
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

      const action = updateTaskTags({
        task: mockTask,
        newTagIds: ['tag2'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['other-task'],
              }),
              tag2: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle adding to multiple new tags', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1'],
            },
            tag2: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              id: 'tag2',
              title: 'Tag 2',
              taskIds: [],
            },
            tag3: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              id: 'tag3',
              title: 'Tag 3',
              taskIds: [],
            },
          },
          ids: [...(initialState[TAG_FEATURE_NAME]!.ids as string[]), 'tag2', 'tag3'],
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

      const action = updateTaskTags({
        task: mockTask,
        newTagIds: ['tag2', 'tag3'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: [],
              }),
              tag2: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
              tag3: jasmine.objectContaining({
                taskIds: ['task1'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle removing from multiple old tags', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'other-task'],
            },
            tag2: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              id: 'tag2',
              title: 'Tag 2',
              taskIds: ['task1', 'another-task'],
            },
          },
          ids: [...(initialState[TAG_FEATURE_NAME]!.ids as string[]), 'tag2'],
        },
      };

      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: ['tag1', 'tag2'],
        projectId: 'project1',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = updateTaskTags({
        task: mockTask,
        newTagIds: [],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['other-task'],
              }),
              tag2: jasmine.objectContaining({
                taskIds: ['another-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle no changes when tags are the same', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1'],
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

      const action = updateTaskTags({
        task: mockTask,
        newTagIds: ['tag1'],
      });

      metaReducer(updatedInitialState as RootState, action);

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

    it('should not duplicate task in tag when already present', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'existing-task'],
            },
          },
        },
      };

      const mockTask: Task = {
        id: 'task1',
        title: 'Test Task',
        created: Date.now(),
        isDone: false,
        tagIds: [],
        projectId: 'project1',
        subTaskIds: [],
        timeSpentOnDay: {},
        timeSpent: 0,
        timeEstimate: 0,
        attachments: [],
      };

      const action = updateTaskTags({
        task: mockTask,
        newTagIds: ['tag1'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
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

  describe('deleteProject action', () => {
    it('should remove all project tasks from all tags', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['task1', 'task2', 'keep-task'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'task3', 'keep-task'],
            },
          },
        },
      };

      const mockProject: Project = {
        id: 'project1',
        title: 'Test Project',
        isArchived: false,
        isHiddenFromMenu: false,
        isEnableBacklog: true,
        taskIds: ['task1', 'task2'],
        backlogTaskIds: ['task3'],
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

      const action = deleteProject({
        project: mockProject,
        allTaskIds: ['task1', 'task2', 'task3'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['keep-task'],
              }),
              TODAY: jasmine.objectContaining({
                taskIds: ['keep-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle empty project task lists', () => {
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

      const action = deleteProject({
        project: mockProject,
        allTaskIds: [],
      });

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

    it('should not affect tasks not in the project', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            tag1: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.tag1 as Tag),
              taskIds: ['project-task', 'other-task', 'unrelated-task'],
            },
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['project-task', 'other-project-task'],
            },
          },
        },
      };

      const mockProject: Project = {
        id: 'project1',
        title: 'Test Project',
        isArchived: false,
        isHiddenFromMenu: false,
        isEnableBacklog: true,
        taskIds: ['project-task'],
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

      const action = deleteProject({
        project: mockProject,
        allTaskIds: ['project-task'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              tag1: jasmine.objectContaining({
                taskIds: ['other-task', 'unrelated-task'],
              }),
              TODAY: jasmine.objectContaining({
                taskIds: ['other-project-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle projects with no tasks in tags', () => {
      const mockProject: Project = {
        id: 'project1',
        title: 'Test Project',
        isArchived: false,
        isHiddenFromMenu: false,
        isEnableBacklog: true,
        taskIds: ['nonexistent-task'],
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

      const action = deleteProject({
        project: mockProject,
        allTaskIds: ['nonexistent-task'],
      });

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

  describe('planTasksForToday action', () => {
    it('should add new tasks to the top of Today tag', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['existing-task'],
            },
          },
        },
      };

      const action = planTasksForToday({
        taskIds: ['task1', 'task2'],
        parentTaskMap: {},
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1', 'task2', 'existing-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should not add tasks that are already in Today tag', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'existing-task'],
            },
          },
        },
      };

      const action = planTasksForToday({
        taskIds: ['task1', 'task2'],
        parentTaskMap: {},
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task2', 'task1', 'existing-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle parentTaskMap filtering', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['parent-task'],
            },
          },
        },
      };

      const action = planTasksForToday({
        taskIds: ['subtask1', 'task2'],
        parentTaskMap: { subtask1: 'parent-task' },
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task2', 'parent-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle empty taskIds array', () => {
      const action = planTasksForToday({
        taskIds: [],
        parentTaskMap: {},
      });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: [],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle empty parentTaskMap', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['existing-task'],
            },
          },
        },
      };

      const action = planTasksForToday({
        taskIds: ['task1'],
        parentTaskMap: {},
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1', 'existing-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });
  });

  describe('removeTasksFromTodayTag action', () => {
    it('should remove specified tasks from Today tag', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'task2', 'keep-task'],
            },
          },
        },
      };

      const action = removeTasksFromTodayTag({
        taskIds: ['task1', 'task2'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['keep-task'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle empty taskIds array', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'task2'],
            },
          },
        },
      };

      const action = removeTasksFromTodayTag({
        taskIds: [],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1', 'task2'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle removing nonexistent tasks', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'task2'],
            },
          },
        },
      };

      const action = removeTasksFromTodayTag({
        taskIds: ['nonexistent-task'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1', 'task2'],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should handle empty Today tag', () => {
      const action = removeTasksFromTodayTag({
        taskIds: ['task1'],
      });

      metaReducer(initialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: [],
              }),
            }),
          }),
        }),
        action,
      );
    });

    it('should remove only specified tasks and keep others', () => {
      const updatedInitialState = {
        ...initialState,
        [TAG_FEATURE_NAME]: {
          ...initialState[TAG_FEATURE_NAME]!,
          entities: {
            ...initialState[TAG_FEATURE_NAME]!.entities,
            TODAY: {
              ...(initialState[TAG_FEATURE_NAME]!.entities.TODAY as Tag),
              taskIds: ['task1', 'task2', 'task3', 'task4'],
            },
          },
        },
      };

      const action = removeTasksFromTodayTag({
        taskIds: ['task2', 'task4'],
      });

      metaReducer(updatedInitialState as RootState, action);

      expect(mockReducer).toHaveBeenCalledWith(
        jasmine.objectContaining({
          [TAG_FEATURE_NAME]: jasmine.objectContaining({
            entities: jasmine.objectContaining({
              TODAY: jasmine.objectContaining({
                taskIds: ['task1', 'task3'],
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
