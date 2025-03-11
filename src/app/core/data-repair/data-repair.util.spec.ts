import { AppDataComplete } from '../../imex/sync/sync.model';
import { createAppDataCompleteMock } from '../../util/app-data-mock';
import { dataRepair } from './data-repair.util';
import { fakeEntityStateFromArray } from '../../util/fake-entity-state-from-array';
import { DEFAULT_TASK, Task } from '../../features/tasks/task.model';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { Tag, TagState } from '../../features/tag/tag.model';
import { Project, ProjectState } from '../../features/project/project.model';
import { DEFAULT_PROJECT } from '../../features/project/project.const';
import { DEFAULT_TAG, TODAY_TAG } from '../../features/tag/tag.const';
import { TaskRepeatCfg } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { IssueProvider } from '../../features/issue/issue.model';

const FAKE_PROJECT_ID = 'FAKE_PROJECT_ID';
describe('dataRepair()', () => {
  let mock: AppDataComplete;
  beforeEach(() => {
    mock = createAppDataCompleteMock();
    mock.project = {
      ...fakeEntityStateFromArray([
        {
          title: 'FAKE_PROJECT',
          id: FAKE_PROJECT_ID,
          taskIds: [],
          backlogTaskIds: [],
          noteIds: [],
        },
      ] as Partial<Project>[]),
    };

    mock.tag = {
      ...fakeEntityStateFromArray([
        {
          ...TODAY_TAG,
        },
      ] as Partial<Tag>[]),
    };
  });

  it('should delete tasks with same id in "task" and "taskArchive" from taskArchive', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'TEST',
          title: 'TEST',
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;
    expect(
      dataRepair({
        ...mock,
        task: taskState,
        taskArchive: fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'TEST',
            title: 'TEST',
            projectId: FAKE_PROJECT_ID,
          },
        ]),
      } as any),
    ).toEqual({
      ...mock,
      task: taskState,
      // TODO fix
      taskArchive: {
        ...createEmptyEntity(),
      },
    });
  });

  it('should delete missing tasks for tags today list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'TEST',
          title: 'TEST',
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    const tagState: TagState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_TAG',
          id: 'TEST_ID_TAG',
          taskIds: ['goneTag', 'TEST', 'noneExisting'],
        },
      ] as Partial<Tag>[]),
    };

    expect(
      dataRepair({
        ...mock,
        tag: tagState,
        task: taskState,
      }),
    ).toEqual({
      ...mock,
      task: taskState as any,
      tag: {
        ...tagState,
        entities: {
          TEST_ID_TAG: {
            title: 'TEST_TAG',
            id: 'TEST_ID_TAG',
            taskIds: ['TEST'],
          },
        } as any,
      },
    });
  });

  it('should delete missing tasks for projects today list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'TEST',
          title: 'TEST',
          projectId: 'TEST_ID_PROJECT',
        },
      ]),
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_PROJECT',
          id: 'TEST_ID_PROJECT',
          taskIds: ['goneProject', 'TEST', 'noneExisting'],
          backlogTaskIds: [],
          noteIds: [],
        },
      ] as Partial<Project>[]),
    };

    expect(
      dataRepair({
        ...mock,
        project: projectState,
        task: taskState,
      }),
    ).toEqual({
      ...mock,
      task: taskState as any,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: ['TEST'],
            backlogTaskIds: [],
            noteIds: [],
          },
        } as any,
      },
    });
  });

  it('should remove tasks with missing data from the project lists', () => {
    const taskState = {
      ...mock.task,
      ids: ['EXISTING'],
      entities: {
        EXISTING: { ...DEFAULT_TASK, id: 'EXISTING', projectId: 'TEST_PROJECT' },
      },
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_PROJECT',
          id: 'TEST_ID_PROJECT',
          taskIds: ['EXISTING', 'goneProject', 'TEST', 'noneExisting'],
          backlogTaskIds: ['noneExistingBacklog', 'nullBacklog'],
          noteIds: [],
        },
      ] as Partial<Project>[]),
    };

    expect(
      dataRepair({
        ...mock,
        project: projectState,
        task: taskState,
      }),
    ).toEqual({
      ...mock,
      task: taskState as any,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: ['EXISTING'],
            backlogTaskIds: [],
            noteIds: [],
          },
        } as any,
      },
    });
  });

  it('should remove notes with missing data from the project lists', () => {
    const noteState = {
      ...mock.note,
      ids: ['EXISTING'],
      entities: {
        EXISTING: { id: 'EXISTING', projectId: 'TEST_PROJECT' },
      },
      todayOrder: [],
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_PROJECT',
          id: 'TEST_ID_PROJECT',
          taskIds: [],
          backlogTaskIds: [],
          noteIds: ['EXISTING', 'goneProject', 'noneExisting'],
        },
      ] as Partial<Project>[]),
    };

    expect(
      dataRepair({
        ...mock,
        project: projectState,
        note: noteState,
      }),
    ).toEqual({
      ...mock,
      note: noteState as any,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: [],
            backlogTaskIds: [],
            noteIds: ['EXISTING'],
          },
        } as any,
      },
    });
  });

  it('should remove tasks archived sub tasks from any project lists', () => {
    const taskArchiveState = {
      ...mock.taskArchive,
      ids: ['PAR_ID', 'SUB_ID'],
      entities: {
        SUB_ID: {
          ...DEFAULT_TASK,
          id: 'SUB_ID',
          projectId: 'TEST_PROJECT',
          parentId: 'PAR_ID',
        },
        PAR_ID: { ...DEFAULT_TASK, id: 'PAR_ID', projectId: 'TEST_PROJECT' },
      },
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_PROJECT',
          id: 'TEST_ID_PROJECT',
          taskIds: [],
          backlogTaskIds: ['SUB_ID'],
          noteIds: [],
        },
      ] as Partial<Project>[]),
    };

    expect(
      dataRepair({
        ...mock,
        project: projectState,
        taskArchive: taskArchiveState,
      }),
    ).toEqual({
      ...mock,
      taskArchive: taskArchiveState,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: [],
            backlogTaskIds: [],
            noteIds: [],
          },
        } as any,
      },
    });
  });

  it('should delete missing tasks for projects backlog list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'TEST',
          title: 'TEST',
        },
      ]),
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_PROJECT',
          id: 'TEST_ID_PROJECT',
          taskIds: [],
          backlogTaskIds: ['goneProject', 'TEST', 'noneExisting'],
          noteIds: [],
        },
      ] as Partial<Project>[]),
    };

    expect(
      dataRepair({
        ...mock,
        project: projectState,
        task: taskState,
      }),
    ).toEqual({
      ...mock,
      task: taskState as any,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: [],
            backlogTaskIds: ['TEST'],
            noteIds: [],
          },
        } as any,
      },
    });
  });

  describe('should fix duplicate entities for', () => {
    it('task', () => {
      expect(
        dataRepair({
          ...mock,
          task: {
            ...mock.task,
            ...fakeEntityStateFromArray<Task>([
              {
                ...DEFAULT_TASK,
                id: 'DUPE',
                title: 'DUPE',
                projectId: FAKE_PROJECT_ID,
              },
              {
                ...DEFAULT_TASK,
                id: 'DUPE',
                title: 'DUPE',
                projectId: FAKE_PROJECT_ID,
              },
              {
                ...DEFAULT_TASK,
                id: 'NO_DUPE',
                title: 'NO_DUPE',
                projectId: FAKE_PROJECT_ID,
              },
            ]),
          } as any,
        }),
      ).toEqual({
        ...mock,
        task: {
          ...mock.task,
          ...fakeEntityStateFromArray<Task>([
            {
              ...DEFAULT_TASK,
              id: 'DUPE',
              title: 'DUPE',
              projectId: FAKE_PROJECT_ID,
            },
            {
              ...DEFAULT_TASK,
              id: 'NO_DUPE',
              title: 'NO_DUPE',
              projectId: FAKE_PROJECT_ID,
            },
          ]),
        } as any,
      });
    });

    it('taskArchive', () => {
      expect(
        dataRepair({
          ...mock,
          taskArchive: {
            ...mock.taskArchive,
            ...fakeEntityStateFromArray<Task>([
              {
                ...DEFAULT_TASK,
                id: 'DUPE',
                title: 'DUPE',
                projectId: FAKE_PROJECT_ID,
              },
              {
                ...DEFAULT_TASK,
                id: 'DUPE',
                title: 'DUPE',
                projectId: FAKE_PROJECT_ID,
              },
              {
                ...DEFAULT_TASK,
                id: 'NO_DUPE',
                title: 'NO_DUPE',
                projectId: FAKE_PROJECT_ID,
              },
            ]),
          } as any,
        }),
      ).toEqual({
        ...mock,
        taskArchive: {
          ...mock.taskArchive,
          ...fakeEntityStateFromArray<Task>([
            {
              ...DEFAULT_TASK,
              id: 'DUPE',
              title: 'DUPE',
              projectId: FAKE_PROJECT_ID,
            },
            {
              ...DEFAULT_TASK,
              id: 'NO_DUPE',
              title: 'NO_DUPE',
              projectId: FAKE_PROJECT_ID,
            },
          ]),
        } as any,
      });
    });
  });

  describe('should fix inconsistent entity states for', () => {
    it('task', () => {
      expect(
        dataRepair({
          ...mock,
          task: {
            ids: ['AAA, XXX', 'YYY'],
            entities: {
              AAA: { ...DEFAULT_TASK, id: 'AAA', projectId: FAKE_PROJECT_ID },
              CCC: { ...DEFAULT_TASK, id: 'CCC', projectId: FAKE_PROJECT_ID },
            },
          } as any,
        }),
      ).toEqual({
        ...mock,
        task: {
          ids: ['AAA', 'CCC'],
          entities: {
            AAA: { ...DEFAULT_TASK, id: 'AAA', projectId: FAKE_PROJECT_ID },
            CCC: { ...DEFAULT_TASK, id: 'CCC', projectId: FAKE_PROJECT_ID },
          },
        } as any,
      });
    });
    it('taskArchive', () => {
      expect(
        dataRepair({
          ...mock,
          taskArchive: {
            ids: ['AAA, XXX', 'YYY'],
            entities: {
              AAA: { ...DEFAULT_TASK, id: 'AAA', projectId: FAKE_PROJECT_ID },
              CCC: { ...DEFAULT_TASK, id: 'CCC', projectId: FAKE_PROJECT_ID },
            },
          } as any,
        }),
      ).toEqual({
        ...mock,
        taskArchive: {
          ids: ['AAA', 'CCC'],
          entities: {
            AAA: { ...DEFAULT_TASK, id: 'AAA', projectId: FAKE_PROJECT_ID },
            CCC: { ...DEFAULT_TASK, id: 'CCC', projectId: FAKE_PROJECT_ID },
          },
        } as any,
      });
    });
  });

  it('should restore missing tasks from taskArchive if available', () => {
    const taskArchiveState = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'goneToArchiveToday',
          title: 'goneToArchiveToday',
          projectId: 'TEST_ID_PROJECT',
        },
        {
          ...DEFAULT_TASK,
          id: 'goneToArchiveBacklog',
          title: 'goneToArchiveBacklog',
          projectId: 'TEST_ID_PROJECT',
        },
      ]),
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_PROJECT',
          id: 'TEST_ID_PROJECT',
          taskIds: ['goneToArchiveToday', 'GONE'],
          backlogTaskIds: ['goneToArchiveBacklog', 'GONE'],
          noteIds: [],
        },
      ] as Partial<Project>[]),
    };

    expect(
      dataRepair({
        ...mock,
        project: projectState,
        taskArchive: taskArchiveState,
        task: {
          ...mock.task,
          ...createEmptyEntity(),
        } as any,
      }),
    ).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'goneToArchiveToday',
            title: 'goneToArchiveToday',
            projectId: 'TEST_ID_PROJECT',
          },
          {
            ...DEFAULT_TASK,
            id: 'goneToArchiveBacklog',
            title: 'goneToArchiveBacklog',
            projectId: 'TEST_ID_PROJECT',
          },
        ]),
      } as any,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: ['goneToArchiveToday'],
            backlogTaskIds: ['goneToArchiveBacklog'],
            noteIds: [],
          },
        } as any,
      },
    });
  });

  it('should add orphan tasks to their project list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'orphanedTask',
          title: 'orphanedTask',
          projectId: 'TEST_ID_PROJECT',
          parentId: undefined,
        },
        {
          ...DEFAULT_TASK,
          id: 'orphanedTaskOtherProject',
          title: 'orphanedTaskOtherProject',
          projectId: 'TEST_ID_PROJECT_OTHER',
          parentId: undefined,
        },
        {
          ...DEFAULT_TASK,
          id: 'regularTaskOtherProject',
          title: 'regularTaskOtherProject',
          projectId: 'TEST_ID_PROJECT_OTHER',
          parentId: undefined,
        },
      ]),
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([
        {
          title: 'TEST_PROJECT',
          id: 'TEST_ID_PROJECT',
          taskIds: ['GONE'],
          backlogTaskIds: [],
          noteIds: [],
        },
        {
          title: 'TEST_PROJECT_OTHER',
          id: 'TEST_ID_PROJECT_OTHER',
          taskIds: ['regularTaskOtherProject'],
          backlogTaskIds: [],
          noteIds: [],
        },
      ] as Partial<Project>[]),
    };

    expect(
      dataRepair({
        ...mock,
        project: projectState,
        task: taskState,
      }),
    ).toEqual({
      ...mock,
      task: taskState,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: ['orphanedTask'],
            backlogTaskIds: [],
            noteIds: [],
          },
          TEST_ID_PROJECT_OTHER: {
            title: 'TEST_PROJECT_OTHER',
            id: 'TEST_ID_PROJECT_OTHER',
            taskIds: ['regularTaskOtherProject', 'orphanedTaskOtherProject'],
            backlogTaskIds: [],
            noteIds: [],
          },
        } as any,
      },
    });
  });

  it('should move archived sub tasks back to their unarchived parents', () => {
    const taskStateBefore = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'subTaskUnarchived',
          title: 'subTaskUnarchived',
          parentId: 'parent',
          projectId: FAKE_PROJECT_ID,
        },
        {
          ...DEFAULT_TASK,
          id: 'parent',
          title: 'parent',
          parentId: undefined,
          subTaskIds: ['subTaskUnarchived'],
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    const taskArchiveStateBefore = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'subTaskArchived',
          title: 'subTaskArchived',
          parentId: 'parent',
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        task: taskStateBefore,
        taskArchive: taskArchiveStateBefore,
      }),
    ).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTaskUnarchived',
            title: 'subTaskUnarchived',
            parentId: 'parent',
            projectId: FAKE_PROJECT_ID,
          },
          {
            ...DEFAULT_TASK,
            id: 'parent',
            title: 'parent',
            parentId: undefined,
            subTaskIds: ['subTaskUnarchived', 'subTaskArchived'],
            projectId: FAKE_PROJECT_ID,
          },
          {
            ...DEFAULT_TASK,
            id: 'subTaskArchived',
            title: 'subTaskArchived',
            parentId: 'parent',
            projectId: FAKE_PROJECT_ID,
          },
        ]),
      } as any,
      taskArchive: {
        ...mock.taskArchive,
        ...fakeEntityStateFromArray<Task>([]),
      } as any,
    });
  });

  it('should move unarchived sub tasks to their archived parents', () => {
    const taskStateBefore = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'subTaskUnarchived',
          title: 'subTaskUnarchived',
          parentId: 'parent',
        },
      ]),
    } as any;

    const taskArchiveStateBefore = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'subTaskArchived',
          title: 'subTaskArchived',
          parentId: 'parent',
        },
        {
          ...DEFAULT_TASK,
          id: 'parent',
          title: 'parent',
          parentId: undefined,
          subTaskIds: ['subTaskArchived'],
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        task: taskStateBefore,
        taskArchive: taskArchiveStateBefore,
      }),
    ).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([]),
      } as any,
      taskArchive: {
        ...mock.taskArchive,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTaskArchived',
            title: 'subTaskArchived',
            parentId: 'parent',
            projectId: FAKE_PROJECT_ID,
          },
          {
            ...DEFAULT_TASK,
            id: 'parent',
            title: 'parent',
            parentId: undefined,
            subTaskIds: ['subTaskArchived', 'subTaskUnarchived'],
            projectId: FAKE_PROJECT_ID,
          },
          {
            ...DEFAULT_TASK,
            id: 'subTaskUnarchived',
            title: 'subTaskUnarchived',
            parentId: 'parent',
            projectId: FAKE_PROJECT_ID,
          },
        ]),
      } as any,
    });
  });

  it('should assign task projectId according to parent', () => {
    const project = {
      ...mock.project,
      ...fakeEntityStateFromArray<Project>([
        {
          ...DEFAULT_PROJECT,
          id: 'p1',
        },
      ]),
    } as any;

    const taskStateBefore = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'subTask1',
          title: 'subTask1',
          projectId: undefined,
          parentId: 'parent',
        },
        {
          ...DEFAULT_TASK,
          id: 'subTask2',
          title: 'subTask2',
          projectId: undefined,
          parentId: 'parent',
        },
        {
          ...DEFAULT_TASK,
          id: 'parent',
          title: 'parent',
          parentId: undefined,
          projectId: 'p1',
          subTaskIds: ['subTask1', 'subTask2'],
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        project,
        task: taskStateBefore,
      }),
    ).toEqual({
      ...mock,
      project,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTask1',
            title: 'subTask1',
            parentId: 'parent',
            projectId: 'p1',
          },
          {
            ...DEFAULT_TASK,
            id: 'subTask2',
            title: 'subTask2',
            parentId: 'parent',
            projectId: 'p1',
          },
          {
            ...DEFAULT_TASK,
            id: 'parent',
            title: 'parent',
            parentId: undefined,
            subTaskIds: ['subTask1', 'subTask2'],
            projectId: 'p1',
          },
        ]),
      } as any,
    });
  });

  it('should delete non-existent project ids for tasks in "task"', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'TEST',
          title: 'TEST',
          projectId: 'NON_EXISTENT',
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        task: taskState,
      } as any),
    ).toEqual({
      ...mock,
      task: {
        ...taskState,
        entities: {
          TEST: {
            ...taskState.entities.TEST,
          },
        },
      },
    });
  });

  it('should delete non-existent project ids for tasks in "taskArchive"', () => {
    const taskArchiveState = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'TEST',
          title: 'TEST',
          projectId: 'NON_EXISTENT',
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        taskArchive: taskArchiveState,
      } as any),
    ).toEqual({
      ...mock,
      taskArchive: {
        ...taskArchiveState,
        entities: {
          TEST: {
            ...taskArchiveState.entities.TEST,
          },
        },
      },
    });
  });

  it('should delete non-existent project ids for issueProviders', () => {
    const issueProviderState = {
      ...mock.issueProvider,
      ...fakeEntityStateFromArray<IssueProvider>([
        {
          id: 'TEST',
          defaultProjectId: 'NON_EXISTENT',
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        issueProvider: issueProviderState,
      } as any),
    ).toEqual({
      ...mock,
      issueProvider: {
        ...issueProviderState,
        entities: {
          TEST: {
            ...issueProviderState.entities.TEST,
            defaultProjectId: null,
          },
        },
      },
    });
  });

  it('should delete non-existent project ids for taskRepeatCfgCfgs', () => {
    const taskRepeatCfgState = {
      ...mock.taskRepeatCfg,
      ...fakeEntityStateFromArray<TaskRepeatCfg>([
        {
          id: 'TEST',
          title: 'TEST',
          projectId: 'NON_EXISTENT',
          lastTaskCreation: 0,
          defaultEstimate: undefined,
          startTime: undefined,
          remindAt: undefined,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
          tagIds: ['SOME_TAG'],
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        taskRepeatCfg: taskRepeatCfgState,
      } as any),
    ).toEqual({
      ...mock,
      taskRepeatCfg: {
        ...taskRepeatCfgState,
        entities: {
          TEST: {
            ...taskRepeatCfgState.entities.TEST,
          },
        },
      },
    });
  });

  it('should delete non-existent taskRepeatCfg if projectId is missing and no tags', () => {
    const taskRepeatCfgState = {
      ...mock.taskRepeatCfg,
      ...fakeEntityStateFromArray<TaskRepeatCfg>([
        {
          id: 'TEST',
          title: 'TEST',
          projectId: 'NON_EXISTENT',
          lastTaskCreation: 0,
          defaultEstimate: undefined,
          startTime: undefined,
          remindAt: undefined,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
          tagIds: [],
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        taskRepeatCfg: taskRepeatCfgState,
      } as any),
    ).toEqual({
      ...mock,
      taskRepeatCfg: {
        ...taskRepeatCfgState,
        ids: [],
        entities: {},
      },
    });
  });

  it('should remove from project list if task has wrong project id', () => {
    const project = {
      ...mock.project,
      ...fakeEntityStateFromArray<Project>([
        {
          ...DEFAULT_PROJECT,
          id: 'p1',
          taskIds: ['t1', 't2'],
        },
        {
          ...DEFAULT_PROJECT,
          id: 'p2',
          taskIds: ['t1'],
        },
      ]),
    } as any;

    const task = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 't1',
          projectId: 'p1',
        },
        {
          ...DEFAULT_TASK,
          id: 't2',
          projectId: 'p1',
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        project,
        task,
      }),
    ).toEqual({
      ...mock,
      project: {
        ...project,
        ...fakeEntityStateFromArray<Project>([
          {
            ...DEFAULT_PROJECT,
            id: 'p1',
            taskIds: ['t1', 't2'],
          },
          {
            ...DEFAULT_PROJECT,
            id: 'p2',
            taskIds: [],
          },
        ]),
      },
      task,
    });
  });

  it('should move to project if task has no projectId', () => {
    const project = {
      ...mock.project,
      ...fakeEntityStateFromArray<Project>([
        {
          ...DEFAULT_PROJECT,
          id: 'p1',
          taskIds: ['t1', 't2'],
        },
      ]),
    } as any;

    const task = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 't1',
          projectId: 'p1',
        },
        {
          ...DEFAULT_TASK,
          id: 't2',
          projectId: undefined,
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        project,
        task,
      }),
    ).toEqual({
      ...mock,
      project,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 't1',
            projectId: 'p1',
          },
          {
            ...DEFAULT_TASK,
            id: 't2',
            projectId: 'p1',
          },
        ]),
      } as any,
    });
  });

  it('should move to project if backlogTask has no projectId', () => {
    const project = {
      ...mock.project,
      ...fakeEntityStateFromArray<Project>([
        {
          ...DEFAULT_PROJECT,
          id: 'p1',
          backlogTaskIds: ['t1', 't2'],
        },
      ]),
    } as any;

    const task = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 't1',
          projectId: 'p1',
        },
        {
          ...DEFAULT_TASK,
          id: 't2',
          projectId: undefined,
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        project,
        task,
      }),
    ).toEqual({
      ...mock,
      project,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 't1',
            projectId: 'p1',
          },
          {
            ...DEFAULT_TASK,
            id: 't2',
            projectId: 'p1',
          },
        ]),
      } as any,
    });
  });

  it('should add tagId to task if listed, but task does not contain it', () => {
    const tag = {
      ...mock.tag,
      ...fakeEntityStateFromArray<Tag>([
        {
          ...DEFAULT_TAG,
          id: 'tag1',
          taskIds: ['task1', 'task2'],
        },
      ]),
    } as any;

    const task = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'task1',
          tagIds: ['tag1'],
        },
        {
          ...DEFAULT_TASK,
          id: 'task2',
          tagIds: [],
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        tag,
        task,
      }),
    ).toEqual({
      ...mock,
      tag,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'task1',
            tagIds: ['tag1'],
          },
          {
            ...DEFAULT_TASK,
            id: 'task2',
            tagIds: ['tag1'],
          },
        ]),
      } as any,
    });
  });

  // !!! NOTE: does not test, what it is supposed to
  it('should cleanup orphaned sub tasks', () => {
    const task = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'task1',
          subTaskIds: ['s1', 's2GONE'],
          projectId: FAKE_PROJECT_ID,
        },
        {
          ...DEFAULT_TASK,
          id: 's1',
          parentId: 'task1',
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    const taskArchive = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'archiveTask1',
          subTaskIds: ['as1', 'as2GONE'],
          projectId: FAKE_PROJECT_ID,
        },
        {
          ...DEFAULT_TASK,
          id: 'as1',
          parentId: 'archiveTask1',
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        task,
        taskArchive,
      }),
    ).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'task1',
            subTaskIds: ['s1'],
            projectId: FAKE_PROJECT_ID,
          },
          {
            ...DEFAULT_TASK,
            id: 's1',
            parentId: 'task1',
            projectId: FAKE_PROJECT_ID,
          },
        ]),
      } as any,
      taskArchive: {
        ...mock.taskArchive,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'archiveTask1',
            subTaskIds: ['as1'],
            projectId: FAKE_PROJECT_ID,
          },
          {
            ...DEFAULT_TASK,
            id: 'as1',
            parentId: 'archiveTask1',
            projectId: FAKE_PROJECT_ID,
          },
        ]),
      } as any,
    });
  });

  it('should cleanup missing sub tasks from their parent', () => {
    const task = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'task1',
          subTaskIds: ['s2GONE'],
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    const taskArchive = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'archiveTask1',
          subTaskIds: ['as2GONE', 'other gone'],
          projectId: FAKE_PROJECT_ID,
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        task,
        taskArchive,
      }),
    ).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'task1',
            subTaskIds: [],
            projectId: FAKE_PROJECT_ID,
          },
        ]),
      } as any,
      taskArchive: {
        ...mock.taskArchive,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'archiveTask1',
            subTaskIds: [],
            projectId: FAKE_PROJECT_ID,
          },
        ]),
      } as any,
    });
  });

  it('should add today tag if no projectId or no tags', () => {
    const task = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'task1',
          subTaskIds: ['sub_task'],
        },
        {
          ...DEFAULT_TASK,
          id: 'task2',
          projectId: FAKE_PROJECT_ID,
        },
        {
          ...DEFAULT_TASK,
          id: 'sub_task',
          parentId: 'task1',
        },
      ]),
    } as any;

    const taskArchive = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'archiveTask1',
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        task,
        taskArchive,
      }),
    ).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'task1',
            tagIds: [TODAY_TAG.id],
            subTaskIds: ['sub_task'],
          },
          {
            ...DEFAULT_TASK,
            id: 'task2',
            projectId: FAKE_PROJECT_ID,
          },
          {
            ...DEFAULT_TASK,
            id: 'sub_task',
            parentId: 'task1',
          },
        ]),
      } as any,
      taskArchive: {
        ...mock.taskArchive,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'archiveTask1',
            tagIds: [TODAY_TAG.id],
          },
        ]),
      } as any,
    });
  });

  it('should remove missing reminders from tasks', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'TEST',
          title: 'TEST',
          reminderId: 'R1',
          plannedAt: 12321,
        },
        {
          ...DEFAULT_TASK,
          id: 'TEST2',
          title: 'TEST2',
          reminderId: 'R2_MISSING',
          plannedAt: 12321,
        },
      ]),
    } as any;

    expect(
      dataRepair({
        ...mock,
        task: taskState,
        reminders: [{ id: 'R1' }],
      } as any),
    ).toEqual({
      ...mock,
      reminders: [{ id: 'R1' } as any],
      task: {
        ...taskState,
        entities: {
          TEST: {
            ...taskState.entities.TEST,
            reminderId: 'R1',
            plannedAt: 12321,
          },
          TEST2: {
            ...taskState.entities.TEST2,
            reminderId: undefined,
            plannedAt: undefined,
          },
        },
      },
    });
  });
});
