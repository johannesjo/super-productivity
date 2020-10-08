import { AppDataComplete } from '../../imex/sync/sync.model';
import { createAppDataCompleteMock } from '../../util/app-data-mock';
import { dataRepair } from './data-repair.util';
import { fakeEntityStateFromArray } from '../../util/fake-entity-state-from-array';
import { DEFAULT_TASK, Task } from '../../features/tasks/task.model';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { Tag, TagState } from '../../features/tag/tag.model';
import { ProjectState } from '../../features/project/store/project.reducer';
import { Project } from '../../features/project/project.model';

describe('dataRepair()', () => {
  let mock: AppDataComplete;
  beforeEach(() => {
    mock = createAppDataCompleteMock();
  });

  it('should delete tasks with same id in "task" and "taskArchive" from taskArchive', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'TEST',
        title: 'TEST',
      }])
    } as any;
    expect(dataRepair({
      ...mock,
      task: taskState,
      taskArchive: fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'TEST',
        title: 'TEST',
      }]),
    })).toEqual({
      ...mock,
      task: taskState,
      taskArchive: {
        ...createEmptyEntity()
      },
    });
  });

  it('should delete missing tasks for tags today list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'TEST',
        title: 'TEST',
      }])
    } as any;

    const tagState: TagState = {
      ...fakeEntityStateFromArray([{
        title: 'TEST_TAG',
        id: 'TEST_ID_TAG',
        taskIds: ['goneTag', 'TEST', 'noneExisting'],
      }] as Partial<Tag> []),
    };

    expect(dataRepair({
      ...mock,
      tag: tagState,
      task: taskState,
    })).toEqual({
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
        } as any
      }
    });
  });

  it('should delete missing tasks for projects today list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'TEST',
        title: 'TEST',
      }])
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([{
        title: 'TEST_PROJECT',
        id: 'TEST_ID_PROJECT',
        taskIds: ['goneProject', 'TEST', 'noneExisting'],
        backlogTaskIds: [],
      }] as Partial<Project> []),
    };

    expect(dataRepair({
      ...mock,
      project: projectState,
      task: taskState,
    })).toEqual({
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
          },
        } as any
      }
    });
  });

  it('should delete missing tasks for projects backlog list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'TEST',
        title: 'TEST',
      }])
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([{
        title: 'TEST_PROJECT',
        id: 'TEST_ID_PROJECT',
        taskIds: [],
        backlogTaskIds: ['goneProject', 'TEST', 'noneExisting'],
      }] as Partial<Project> []),
    };

    expect(dataRepair({
      ...mock,
      project: projectState,
      task: taskState,
    })).toEqual({
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
          },
        } as any
      }
    });
  });

  describe('should fix duplicate entities for', () => {
    it('task', () => {
      expect(dataRepair({
        ...mock,
        task: {
          ...mock.task,
          ...fakeEntityStateFromArray<Task>([{
            ...DEFAULT_TASK,
            id: 'DUPE',
            title: 'DUPE',
          }, {
            ...DEFAULT_TASK,
            id: 'DUPE',
            title: 'DUPE',
          }, {
            ...DEFAULT_TASK,
            id: 'NO_DUPE',
            title: 'NO_DUPE',
          }])
        } as any,
      })).toEqual({
        ...mock,
        task: {
          ...mock.task,
          ...fakeEntityStateFromArray<Task>([{
            ...DEFAULT_TASK,
            id: 'DUPE',
            title: 'DUPE',
          }, {
            ...DEFAULT_TASK,
            id: 'NO_DUPE',
            title: 'NO_DUPE',
          }])
        } as any,
      });
    });

    it('taskArchive', () => {
      expect(dataRepair({
        ...mock,
        taskArchive: {
          ...mock.taskArchive,
          ...fakeEntityStateFromArray<Task>([{
            ...DEFAULT_TASK,
            id: 'DUPE',
            title: 'DUPE',
          }, {
            ...DEFAULT_TASK,
            id: 'DUPE',
            title: 'DUPE',
          }, {
            ...DEFAULT_TASK,
            id: 'NO_DUPE',
            title: 'NO_DUPE',
          }])
        } as any,
      })).toEqual({
        ...mock,
        taskArchive: {
          ...mock.taskArchive,
          ...fakeEntityStateFromArray<Task>([{
            ...DEFAULT_TASK,
            id: 'DUPE',
            title: 'DUPE',
          }, {
            ...DEFAULT_TASK,
            id: 'NO_DUPE',
            title: 'NO_DUPE',
          }])
        } as any,
      });
    });
  });

  describe('should fix inconsistent entity states for', () => {
    it('task', () => {
      expect(dataRepair({
        ...mock,
        task: {
          ids: ['AAA, XXX', 'YYY'],
          entities: {
            AAA: {},
            CCC: {},
          }
        } as any,
      })).toEqual({
        ...mock,
        task: {
          ids: ['AAA', 'CCC'],
          entities: {
            AAA: {},
            CCC: {},
          }
        } as any,
      });
    });
    it('taskArchive', () => {
      expect(dataRepair({
        ...mock,
        taskArchive: {
          ids: ['AAA, XXX', 'YYY'],
          entities: {
            AAA: {},
            CCC: {},
          }
        } as any,
      })).toEqual({
        ...mock,
        taskArchive: {
          ids: ['AAA', 'CCC'],
          entities: {
            AAA: {},
            CCC: {},
          }
        } as any,
      });
    });
  });

  it('should restore missing tasks from taskArchive if available', () => {
    const taskArchiveState = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'goneToArchiveToday',
        title: 'goneToArchiveToday',
        projectId: 'TEST_ID_PROJECT',
      }, {
        ...DEFAULT_TASK,
        id: 'goneToArchiveBacklog',
        title: 'goneToArchiveBacklog',
        projectId: 'TEST_ID_PROJECT',
      }])
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([{
        title: 'TEST_PROJECT',
        id: 'TEST_ID_PROJECT',
        taskIds: ['goneToArchiveToday', 'GONE'],
        backlogTaskIds: ['goneToArchiveBacklog', 'GONE'],
      }] as Partial<Project> []),
    };

    expect(dataRepair({
      ...mock,
      project: projectState,
      taskArchive: taskArchiveState,
      task: {
        ...mock.task,
        ...createEmptyEntity()
      } as any,
    })).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([{
          ...DEFAULT_TASK,
          id: 'goneToArchiveToday',
          title: 'goneToArchiveToday',
          projectId: 'TEST_ID_PROJECT',
        }, {
          ...DEFAULT_TASK,
          id: 'goneToArchiveBacklog',
          title: 'goneToArchiveBacklog',
          projectId: 'TEST_ID_PROJECT',
        }])
      } as any,
      project: {
        ...projectState,
        entities: {
          TEST_ID_PROJECT: {
            title: 'TEST_PROJECT',
            id: 'TEST_ID_PROJECT',
            taskIds: ['goneToArchiveToday'],
            backlogTaskIds: ['goneToArchiveBacklog'],
          },
        } as any
      }
    });
  });

  it('should add orphan tasks to their project list', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'orphanedTask',
        title: 'orphanedTask',
        projectId: 'TEST_ID_PROJECT',
        parentId: null,
      }, {
        ...DEFAULT_TASK,
        id: 'orphanedTaskOtherProject',
        title: 'orphanedTaskOtherProject',
        projectId: 'TEST_ID_PROJECT_OTHER',
        parentId: null,
      }, {
        ...DEFAULT_TASK,
        id: 'regularTaskOtherProject',
        title: 'regularTaskOtherProject',
        projectId: 'TEST_ID_PROJECT_OTHER',
        parentId: null,
      }])
    } as any;

    const projectState: ProjectState = {
      ...fakeEntityStateFromArray([{
        title: 'TEST_PROJECT',
        id: 'TEST_ID_PROJECT',
        taskIds: ['GONE'],
        backlogTaskIds: [],
      }, {
        title: 'TEST_PROJECT_OTHER',
        id: 'TEST_ID_PROJECT_OTHER',
        taskIds: ['regularTaskOtherProject'],
        backlogTaskIds: [],
      }] as Partial<Project> []),
    };

    expect(dataRepair({
      ...mock,
      project: projectState,
      task: taskState,
    })).toEqual({
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
          },
          TEST_ID_PROJECT_OTHER: {
            title: 'TEST_PROJECT_OTHER',
            id: 'TEST_ID_PROJECT_OTHER',
            taskIds: ['regularTaskOtherProject', 'orphanedTaskOtherProject'],
            backlogTaskIds: [],
          },
        } as any
      }
    });
  });

  fit('should move archived sub tasks back to their unarchived parents', () => {
    const taskStateBefore = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'subTaskUnarchived',
        title: 'subTaskUnarchived',
        parentId: 'parent',
      }, {
        ...DEFAULT_TASK,
        id: 'parent',
        title: 'parent',
        parentId: null,
        subTaskIds: ['subTaskUnarchived']
      }])
    } as any;

    const taskArchiveStateBefore = {
      ...mock.taskArchive,
      ...fakeEntityStateFromArray<Task>([{
        ...DEFAULT_TASK,
        id: 'subTaskArchived',
        title: 'subTaskArchived',
        parentId: 'parent',
      }])
    } as any;

    expect(dataRepair({
      ...mock,
      task: taskStateBefore,
      taskArchive: taskArchiveStateBefore,
    })).toEqual({
      ...mock,
      task: {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([{
          ...DEFAULT_TASK,
          id: 'subTaskUnarchived',
          title: 'subTaskUnarchived',
          parentId: 'parent',
        }, {
          ...DEFAULT_TASK,
          id: 'parent',
          title: 'parent',
          parentId: null,
          subTaskIds: ['subTaskUnarchived', 'subTaskArchived'],
        }, {
          ...DEFAULT_TASK,
          id: 'subTaskArchived',
          title: 'subTaskArchived',
          parentId: 'parent',
        }])
      } as any,
      taskArchive: {
        ...mock.taskArchive,
        ...fakeEntityStateFromArray<Task>([])
      } as any,
    });
  });

});
