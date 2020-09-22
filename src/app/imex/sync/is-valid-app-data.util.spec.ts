import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { AppDataComplete } from './sync.model';
import { EntityState } from '@ngrx/entity';
import { isValidAppData } from './is-valid-app-data.util';
import { MODEL_VERSION_KEY } from '../../app.constants';

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

describe('isValidAppData()', () => {
  it('should work for valid data', () => {
    expect(isValidAppData(MOCK())).toBe(true);
  });

  describe('should error for', () => {

    ['note', 'bookmark', 'improvement', 'obstruction', 'metric', 'task', 'tag', 'globalConfig', 'taskArchive', 'project',
    ].forEach((prop) => {
      it('missing prop ' + prop, () => {
        expect(isValidAppData({
          ...MOCK(),
          [prop]: null,
        })).toBe(false);
      });
    });


  });
});
