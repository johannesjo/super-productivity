import { AppDataComplete } from '../imex/sync/sync.model';
import { MODEL_VERSION_KEY } from '../app.constants';
import { DEFAULT_GLOBAL_CONFIG } from '../features/config/default-global-config.const';
import { createEmptyEntity } from './create-empty-entity';

export const createAppDataCompleteMock = (): AppDataComplete => ({
  project: {
    ...createEmptyEntity(),
    [MODEL_VERSION_KEY]: 5,
  },
  archivedProjects: {},
  globalConfig: DEFAULT_GLOBAL_CONFIG,

  task: {
    ...createEmptyEntity(),
    ids: [],
    currentTaskId: null,
    selectedTaskId: null,
    taskAdditionalInfoTargetPanel: null,
    lastCurrentTaskId: null,
    isDataLoaded: false,
  },
  tag: createEmptyEntity(),
  simpleCounter: {
    ...createEmptyEntity(),
    ids: [],
  },
  taskArchive: createEmptyEntity(),
  taskRepeatCfg: createEmptyEntity(),
  lastLocalSyncModelChange: 0,

  // OPTIONAL though they are really not
  reminders: [],
  note: {},
  bookmark: {},
  metric: createEmptyEntity(),
  improvement: createEmptyEntity() as any,
  obstruction: createEmptyEntity(),
});
