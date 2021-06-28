import { AppDataComplete } from './sync.model';
import { isValidAppData } from './is-valid-app-data.util';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { DEFAULT_TASK, Task } from '../../features/tasks/task.model';
import { fakeEntityStateFromArray } from '../../util/fake-entity-state-from-array';
import { Project } from '../../features/project/project.model';
import { Tag } from '../../features/tag/tag.model';
import { createAppDataCompleteMock } from '../../util/app-data-mock';
import { DEFAULT_PROJECT } from '../../features/project/project.const';

// const BASE_STATE_KEYS: (keyof AppBaseData)[] = [
//   'task',
//   'taskArchive',
//   'tag',
//   'project',
// ];
// const PROJECT_STATE_KEYS: (keyof AppDataForProjects)[] = [
//   'note',
//   'bookmark',
//   'metric',
//   'improvement',
//   'obstruction',
// ];

describe('isValidAppData()', () => {
  let mock: AppDataComplete;
  beforeEach(() => {
    mock = createAppDataCompleteMock();
    spyOn(window, 'alert').and.stub();
  });

  it('should work for valid data', () => {
    expect(isValidAppData(mock)).toBe(true);
  });

  describe('should return false for', () => {
    [
      'note',
      'bookmark',
      'improvement',
      'obstruction',
      'metric',
      'task',
      'tag',
      'globalConfig',
      'taskArchive',
    ].forEach((prop) => {
      it('missing prop ' + prop, () => {
        expect(
          isValidAppData({
            ...mock,
            [prop]: null,
          }),
        ).toBe(false);
      });
    });
  });

  describe('should error for', () => {
    describe('inconsistent entity state', () => {
      ['task', 'taskArchive', 'taskRepeatCfg', 'tag', 'project', 'simpleCounter'].forEach(
        (prop) => {
          it(prop, () => {
            expect(() =>
              isValidAppData({
                ...mock,
                [prop]: {
                  ...mock[prop],
                  entities: {},
                  ids: ['asasdasd'],
                },
              }),
            ).toThrowError(`Inconsistent entity state "${prop}"`);
          });
        },
      );
    });

    it('inconsistent task state', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          task: {
            ...mock.task,
            entities: { 'A asdds': DEFAULT_TASK },
            ids: ['asasdasd'],
          },
        }),
      ).toThrowError(`Inconsistent entity state "task"`);
    });

    it('missing today task data for projects', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          // NOTE: it's empty
          task: mock.task,
          project: {
            ...fakeEntityStateFromArray([
              {
                title: 'TEST_T',
                id: 'TEST_ID',
                taskIds: ['gone'],
              },
            ] as Partial<Project>[]),
            [MODEL_VERSION_KEY]: 5,
          },
        }),
      ).toThrowError(`Missing task data (tid: gone) for Project TEST_T`);
    });

    it('missing reminder data', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          // NOTE: it's empty
          task: {
            ...mock.task,
            ids: ['t1'],
            entities: {
              t1: {
                ...DEFAULT_TASK,
                id: 't1',
                reminderId: 'rid',
              },
            },
          },
        }),
      ).toThrowError(`Missing reminder rid from task not existing`);
    });

    it('missing backlog task data for projects', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          // NOTE: it's empty
          task: mock.task,
          project: {
            ...fakeEntityStateFromArray([
              {
                title: 'TEST_T',
                id: 'TEST_ID',
                taskIds: [],
                backlogTaskIds: ['goneBL'],
              },
            ] as Partial<Project>[]),
            [MODEL_VERSION_KEY]: 5,
          },
        }),
      ).toThrowError(`Missing task data (tid: goneBL) for Project TEST_T`);
    });

    it('missing today task data for tags', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          // NOTE: it's empty
          task: mock.task,
          tag: {
            ...fakeEntityStateFromArray([
              {
                title: 'TEST_TAG',
                id: 'TEST_ID_TAG',
                taskIds: ['goneTag'],
              },
            ] as Partial<Tag>[]),
            [MODEL_VERSION_KEY]: 5,
          },
        }),
      ).toThrowError(
        `Inconsistent Task State: Missing task id goneTag for Project/Tag TEST_TAG`,
      );
    });

    it('orphaned archived sub tasks', () => {
      const taskState = {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTaskUnarchived',
            title: 'subTaskUnarchived',
            parentId: 'parent',
          },
          {
            ...DEFAULT_TASK,
            id: 'parent',
            title: 'parent',
            parentId: null,
            subTaskIds: ['subTaskUnarchived'],
          },
        ]),
      } as any;

      const taskArchiveState = {
        ...mock.taskArchive,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTaskArchived',
            title: 'subTaskArchived',
            parentId: 'parent',
          },
        ]),
      } as any;

      expect(() =>
        isValidAppData({
          ...mock,
          // NOTE: it's empty
          task: taskState,
          taskArchive: taskArchiveState,
        }),
      ).toThrowError(`Inconsistent Task State: Lonely Sub Task in Archive`);
    });

    it('orphaned today sub tasks', () => {
      const taskState = {
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

      const taskArchiveState = {
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
            parentId: null,
            subTaskIds: ['subTaskArchived'],
          },
        ]),
      } as any;

      expect(() =>
        isValidAppData({
          ...mock,
          // NOTE: it's empty
          task: taskState,
          taskArchive: taskArchiveState,
        }),
      ).toThrowError(`Inconsistent Task State: Lonely Sub Task in Today`);
    });

    it('missing tag for task', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          task: {
            ...mock.task,
            ...fakeEntityStateFromArray<Task>([
              {
                ...DEFAULT_TASK,
                tagIds: ['Non existent'],
              },
            ]),
          } as any,
        }),
      ).toThrowError(`tagId "Non existent" from task not existing`);
    });

    it('missing tag for task in archive', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          taskArchive: {
            ...mock.taskArchive,
            ...fakeEntityStateFromArray<Task>([
              {
                ...DEFAULT_TASK,
                tagIds: ['Non existent'],
              },
            ]),
          } as any,
        }),
      ).toThrowError(`tagId "Non existent" from task archive not existing`);
    });

    it('missing projectIds for task', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          task: {
            ...mock.task,
            ...fakeEntityStateFromArray<Task>([
              {
                ...DEFAULT_TASK,
                projectId: 'NON_EXISTENT',
              },
            ]),
          } as any,
        }),
      ).toThrowError(`projectId NON_EXISTENT from task not existing`);
    });

    it('wrong projectIds for listed tasks', () => {
      expect(() =>
        isValidAppData({
          ...mock,
          taskArchive: {
            ...mock.taskArchive,
            ...fakeEntityStateFromArray<Task>([
              {
                ...DEFAULT_TASK,
                projectId: 'NON_EXISTENT',
              },
            ]),
          } as any,
        }),
      ).toThrowError(`projectId NON_EXISTENT from archive task not existing`);
    });
  });

  it('missing projectIds for task', () => {
    expect(() =>
      isValidAppData({
        ...mock,
        project: {
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
        } as any,
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
      }),
    ).toThrowError(`Inconsistent task projectId`);
  });

  it('missing task data', () => {
    expect(() =>
      isValidAppData({
        ...mock,
        project: {
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
        } as any,
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
      }),
    ).toThrowError(`Inconsistent task projectId`);
  });

  it('task without neither tagId nor projectId', () => {
    const taskState = {
      ...mock.task,
      ...fakeEntityStateFromArray<Task>([
        {
          ...DEFAULT_TASK,
          id: 'parent',
          title: 'parent',
          parentId: null,
        },
      ]),
    } as any;

    expect(() =>
      isValidAppData({
        ...mock,
        // NOTE: it's empty
        task: taskState,
      }),
    ).toThrowError(`Task without project or tag`);
  });
});
