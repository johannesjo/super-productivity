import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { AppDataComplete } from './sync.model';
import { EntityState } from '@ngrx/entity';
import { isValidAppData } from './is-valid-app-data.util';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { DEFAULT_TASK } from '../../features/tasks/task.model';

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
      const prop = 'task';
      expect(() => isValidAppData({
        ...mock,
        task: {
          ...mock[prop],
          entities: {'A asdds': DEFAULT_TASK},
          ids: ['asasdasd']
        },
      })).toThrowError(`Inconsistent entity state "${prop}"`);
    });

    it('orphaned today entries for projects', () => {

    });
    it('orphaned backlog entries for projects', () => {

    });
    it('orphaned today entries for tags', () => {

    });
  });
});
