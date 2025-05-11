import { isRelatedModelDataValid } from './is-related-model-data-valid';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { DEFAULT_TASK, Task } from '../../features/tasks/task.model';
import { fakeEntityStateFromArray } from '../../util/fake-entity-state-from-array';
import { Project } from '../../features/project/project.model';
import { Tag } from '../../features/tag/tag.model';
import { createAppDataCompleteMock } from '../../util/app-data-mock';
import { DEFAULT_PROJECT } from '../../features/project/project.const';
import { Note } from '../../features/note/note.model';
import { IssueProvider } from '../../features/issue/issue.model';
import { AppDataCompleteNew } from '../pfapi-config';
/* eslint-disable @typescript-eslint/naming-convention */

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
  let mock: AppDataCompleteNew;
  beforeEach(() => {
    mock = createAppDataCompleteMock();
    spyOn(window, 'alert').and.stub();
    // for mocking away dev error confirm
    spyOn(window, 'confirm').and.returnValue(true);
  });

  it('should work for valid data', () => {
    expect(isRelatedModelDataValid(mock)).toBe(true);
  });

  describe('should error for', () => {
    it('missing today task data for projects', () => {
      expect(() =>
        isRelatedModelDataValid({
          ...mock,
          // NOTE: it's empty
          task: mock.task,
          project: {
            ...fakeEntityStateFromArray([
              {
                title: 'TEST_T',
                id: 'TEST_ID',
                taskIds: ['gone'],
                backlogTaskIds: [],
              },
            ] as Partial<Project>[]),
            [MODEL_VERSION_KEY]: 5,
          },
        }),
      ).toThrowError(`Missing task data (tid: gone) for Project TEST_T`);
    });

    it('missing reminder data', () => {
      expect(() =>
        isRelatedModelDataValid({
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
                projectId: 'p1',
              },
            },
          },
          project: {
            ...fakeEntityStateFromArray([
              {
                ...DEFAULT_PROJECT,
                title: 'p1',
                id: 'p1',
                taskIds: ['t1'],
              },
            ] as Partial<Project>[]),
            [MODEL_VERSION_KEY]: 5,
          },
        }),
      ).toThrowError(`Missing reminder rid from task not existing`);
    });

    it('missing backlog task data for projects', () => {
      expect(() =>
        isRelatedModelDataValid({
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
        isRelatedModelDataValid({
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
      ).toThrowError(`Inconsistent Task State: Missing task id goneTag for Tag TEST_TAG`);
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
            projectId: 'p1',
          },
          {
            ...DEFAULT_TASK,
            id: 'parent',
            title: 'parent',
            parentId: undefined,
            subTaskIds: ['subTaskUnarchived'],
            projectId: 'p1',
          },
        ]),
      } as any;

      const taskArchiveState = {
        ...mock.archiveYoung.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTaskArchived',
            title: 'subTaskArchived',
            parentId: 'parent',
            projectId: 'p1',
          },
        ]),
      } as any;

      expect(() =>
        isRelatedModelDataValid({
          ...mock,
          // NOTE: it's empty
          task: taskState,
          archiveYoung: {
            lastTimeTrackingFlush: 0,
            timeTracking: mock.archiveYoung.timeTracking,
            task: taskArchiveState,
          },
          project: {
            ...mock.project,
            ...fakeEntityStateFromArray<Project>([
              {
                ...DEFAULT_PROJECT,
                id: 'p1',
                taskIds: ['parent'],
              },
            ]),
          },
        }),
      ).toThrowError(
        `Inconsistent Task State: Lonely Sub Task in Archive subTaskArchived`,
      );
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
        ...mock.archiveYoung.task,
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
          },
        ]),
      } as any;

      expect(() =>
        isRelatedModelDataValid({
          ...mock,
          // NOTE: it's empty
          task: taskState,
          archiveYoung: {
            lastTimeTrackingFlush: 0,
            timeTracking: mock.archiveYoung.timeTracking,
            task: taskArchiveState,
          },
        }),
      ).toThrowError(
        `Inconsistent Task State: Lonely Sub Task in Today subTaskUnarchived`,
      );
    });

    it('missing today sub tasks data', () => {
      const taskState = {
        ...mock.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTaskUnarchived',
            title: 'subTaskUnarchived',
            subTaskIds: ['NOOT_THERE'],
            projectId: 'p1',
          },
        ]),
      } as any;
      expect(() =>
        isRelatedModelDataValid({
          ...mock,
          // NOTE: it's empty
          task: taskState,
          project: {
            ...mock.project,
            ...fakeEntityStateFromArray<Project>([
              {
                ...DEFAULT_PROJECT,
                id: 'p1',
                taskIds: ['subTaskUnarchived'],
              },
            ]),
          },
        }),
      ).toThrowError(
        `Inconsistent Task State: Missing sub task data in today NOOT_THERE`,
      );
    });

    it('missing archive sub tasks data', () => {
      const taskArchiveState = {
        ...mock.archiveYoung.task,
        ...fakeEntityStateFromArray<Task>([
          {
            ...DEFAULT_TASK,
            id: 'subTaskUnarchived',
            title: 'subTaskUnarchived',
            subTaskIds: ['NOOT_THERE'],
          },
        ]),
      } as any;
      expect(() =>
        isRelatedModelDataValid({
          ...mock,
          // NOTE: it's empty
          archiveYoung: {
            lastTimeTrackingFlush: 0,
            timeTracking: mock.archiveYoung.timeTracking,
            task: taskArchiveState,
          },
        }),
      ).toThrowError(
        `Inconsistent Task State: Missing sub task data in archive NOOT_THERE`,
      );
    });

    it('missing tag for task', () => {
      expect(() =>
        isRelatedModelDataValid({
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
        isRelatedModelDataValid({
          ...mock,
          archiveYoung: {
            lastTimeTrackingFlush: 0,
            timeTracking: mock.archiveYoung.timeTracking,
            task: {
              ...mock.archiveYoung.task,
              ...fakeEntityStateFromArray<Task>([
                {
                  ...DEFAULT_TASK,
                  tagIds: ['Non existent'],
                },
              ]),
            } as any,
          },
        }),
      ).toThrowError(`tagId "Non existent" from task archive not existing`);
    });

    it('missing projectIds for task', () => {
      expect(() =>
        isRelatedModelDataValid({
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

    it('missing defaultProjectId for issueProvider', () => {
      expect(() =>
        isRelatedModelDataValid({
          ...mock,
          issueProvider: {
            ...mock.issueProvider,
            ...fakeEntityStateFromArray<IssueProvider>([
              {
                defaultProjectId: 'NON_EXISTENT',
              },
            ]),
          } as any,
        }),
      ).toThrowError(`defaultProjectId NON_EXISTENT from issueProvider not existing`);
    });

    it('wrong projectIds for listed tasks', () => {
      expect(() =>
        isRelatedModelDataValid({
          ...mock,
          archiveYoung: {
            lastTimeTrackingFlush: 0,
            timeTracking: mock.archiveYoung.timeTracking,
            task: {
              ...mock.archiveYoung.task,
              ...fakeEntityStateFromArray<Task>([
                {
                  ...DEFAULT_TASK,
                  projectId: 'NON_EXISTENT',
                },
              ]),
            } as any,
          },
        }),
      ).toThrowError(`projectId NON_EXISTENT from archive task not existing`);
    });
  });

  it('missing projectIds for task', () => {
    expect(() =>
      isRelatedModelDataValid({
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
      isRelatedModelDataValid({
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
          parentId: undefined,
        },
      ]),
    } as any;

    expect(() =>
      isRelatedModelDataValid({
        ...mock,
        // NOTE: it's empty
        task: taskState,
      }),
    ).toThrowError(`Task without project or tag`);
  });

  it('should throw for inconsistent note todayOrder list', () => {
    const noteState = {
      ...mock.note,
      ...fakeEntityStateFromArray<Note>([
        {
          id: 'NOOOTE1',
          content: 'NOOOTE1',
        },
      ]),
      todayOrder: ['MISSING'],
    } as any;

    expect(() =>
      isRelatedModelDataValid({
        ...mock,
        // NOTE: it's empty
        note: noteState,
      }),
    ).toThrowError(
      `Inconsistent Note State: Missing note id MISSING for note.todayOrder`,
    );
  });

  it('should throw for missing note data', () => {
    const projectState = {
      ...mock.project,
      ...fakeEntityStateFromArray<Project>([
        {
          ...DEFAULT_PROJECT,
          id: 'NOOOTE1',
          title: 'NOOOTE1',
          noteIds: ['MISSING'],
        },
      ]),
      todayOrder: [],
    } as any;

    expect(() =>
      isRelatedModelDataValid({
        ...mock,
        // NOTE: it's empty
        project: projectState,
      }),
    ).toThrowError(`Missing note data (tid: MISSING) for Project NOOOTE1`);
  });
});
