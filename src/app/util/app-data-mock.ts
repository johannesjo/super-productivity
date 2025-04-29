import { MODEL_VERSION_KEY } from '../app.constants';
import { DEFAULT_GLOBAL_CONFIG } from '../features/config/default-global-config.const';
import { createEmptyEntity } from './create-empty-entity';
import { AppDataCompleteNew } from '../pfapi/pfapi-config';
import { initialTimeTrackingState } from '../features/time-tracking/store/time-tracking.reducer';

export const createAppDataCompleteMock = (): AppDataCompleteNew => ({
  project: {
    ...createEmptyEntity(),
    [MODEL_VERSION_KEY]: 5,
  },
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
  taskRepeatCfg: createEmptyEntity(),

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
  issueProvider: createEmptyEntity() as any,
  boards: {
    boardCfgs: [],
  },
  timeTracking: {
    project: {},
    tag: {},
  },

  archiveYoung: {
    task: createEmptyEntity(),
    timeTracking: initialTimeTrackingState,
    lastTimeTrackingFlush: 0,
  },
  archiveOld: {
    task: createEmptyEntity(),
    timeTracking: initialTimeTrackingState,
    lastTimeTrackingFlush: 0,
  },
});
