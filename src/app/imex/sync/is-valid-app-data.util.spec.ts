import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { AppDataComplete } from './sync.model';
import { EntityState } from '@ngrx/entity';
import { isValidAppData } from './is-valid-app-data.util';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { DEFAULT_TASK, Task } from '../../features/tasks/task.model';
import { fakeEntityStateFromArray } from '../../util/fake-entity-state-from-array';
import { Project } from '../../features/project/project.model';
import { Tag } from '../../features/tag/tag.model';

const EMPTY_ENTITY_MOCK = (): EntityState<any> => ({
  ids: [],
  entities: {}
});

const MOCK = (): AppDataComplete => ({
  project: {
    ...EMPTY_ENTITY_MOCK(),
    [MODEL_VERSION_KEY]: 5
  },
  archivedProjects: {},
  globalConfig: DEFAULT_GLOBAL_CONFIG,

  task: {
    ...EMPTY_ENTITY_MOCK(),
    ids: [],
    currentTaskId: null,
    selectedTaskId: null,
    taskAdditionalInfoTargetPanel: null,
    lastCurrentTaskId: null,
    isDataLoaded: false,
  },
  tag: EMPTY_ENTITY_MOCK(),
  simpleCounter: {
    ...EMPTY_ENTITY_MOCK(),
    ids: []
  },
  taskArchive: EMPTY_ENTITY_MOCK(),
  taskRepeatCfg: EMPTY_ENTITY_MOCK(),
  lastLocalSyncModelChange: 0,

  // OPTIONAL though they are really not
  reminders: [],
  note: {},
  bookmark: {},
  metric: {},
  improvement: {},
  obstruction: {},
});

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
    mock = MOCK();
    spyOn(window, 'alert').and.stub();
  });

  it('should work for valid data', () => {
    expect(isValidAppData(mock)).toBe(true);
  });

  describe('should return false for', () => {
    ['note', 'bookmark', 'improvement', 'obstruction', 'metric', 'task', 'tag', 'globalConfig', 'taskArchive'].forEach((prop) => {
      it('missing prop ' + prop, () => {
        expect(isValidAppData({
          ...mock,
          [prop]: null,
        })).toBe(false);
      });
    });
  });

  describe('should error for', () => {
    describe('inconsistent entity state', () => {
      ['task', 'taskArchive', 'taskRepeatCfg', 'tag', 'project', 'simpleCounter'].forEach(prop => {
        it(prop, () => {
          expect(() => isValidAppData({
            ...mock,
            [prop]: {
              ...mock[prop],
              entities: {},
              ids: ['asasdasd']
            },
          })).toThrowError(`Inconsistent entity state "${prop}"`);
        });
      });
    });

    it('inconsistent task state', () => {
      expect(() => isValidAppData({
        ...mock,
        task: {
          ...mock.task,
          entities: {'A asdds': DEFAULT_TASK},
          ids: ['asasdasd']
        },
      })).toThrowError(`Inconsistent entity state "task"`);
    });

    it('missing today task data for projects', () => {
      expect(() => isValidAppData({
        ...mock,
        // NOTE: it's empty
        task: mock.task,
        project: {
          ...fakeEntityStateFromArray([{
            title: 'TEST_T',
            id: 'TEST_ID',
            taskIds: ['gone'],
          }] as Partial<Project> []),
          [MODEL_VERSION_KEY]: 5
        },
      })).toThrowError(`Inconsistent Task State: Missing task id gone for Project/Tag TEST_T`);
    });

    it('missing backlog task data for projects', () => {
      expect(() => isValidAppData({
        ...mock,
        // NOTE: it's empty
        task: mock.task,
        project: {
          ...fakeEntityStateFromArray([{
            title: 'TEST_T',
            id: 'TEST_ID',
            taskIds: [],
            backlogTaskIds: ['goneBL'],
          }] as Partial<Project> []),
          [MODEL_VERSION_KEY]: 5
        },
      })).toThrowError(`Inconsistent Task State: Missing task id goneBL for Project/Tag TEST_T`);
    });

    it('missing today task data for tags', () => {
      expect(() => isValidAppData({
        ...mock,
        // NOTE: it's empty
        task: mock.task,
        tag: {
          ...fakeEntityStateFromArray([{
            title: 'TEST_TAG',
            id: 'TEST_ID_TAG',
            taskIds: ['goneTag'],
          }] as Partial<Tag> []),
          [MODEL_VERSION_KEY]: 5
        },
      })).toThrowError(`Inconsistent Task State: Missing task id goneTag for Project/Tag TEST_TAG`);
    });

    xit('missing tag for task', () => {
      expect(() => isValidAppData({
        ...mock,
        task: {
          ...mock.task,
          ...fakeEntityStateFromArray<Task>([{
            ...DEFAULT_TASK,
            tagIds: ['Non existent']
          }])
        } as any,
      })).toThrowError(`No tagX`);
    });
  });
});
