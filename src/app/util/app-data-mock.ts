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
    taskDetailTargetPanel: null,
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
  note: {
    ...createEmptyEntity(),
    todayOrder: [],
  },
  metric: createEmptyEntity(),
  improvement: createEmptyEntity() as any,
  obstruction: createEmptyEntity(),
  planner: { days: {}, addPlannedTasksDialogLastShown: undefined },
  lastArchiveUpdate: 0,
  issueProvider: createEmptyEntity() as any,
  boards: {
    boardCfgs: [],
  },
});
