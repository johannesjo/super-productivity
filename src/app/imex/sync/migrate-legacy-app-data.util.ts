import { AppDataComplete } from './sync.model';
import { migrateProjectState } from '../../features/project/migrate-projects-state.util';
import { crossModelMigrations } from '../../core/persistence/cross-model-migrations';
import { migrateGlobalConfigState } from '../../features/config/migrate-global-config.util';
import {
  migrateImprovementState,
  migrateMetricState,
  migrateObstructionState,
} from '../../features/metric/migrate-metric-states.util';
import { migrateTaskState } from '../../features/tasks/migrate-task-state.util';
import { migrateTaskRepeatCfgState } from '../../features/task-repeat-cfg/migrate-task-repeat-cfg-state.util';
import { migrateTagState } from '../../features/tag/migrate-tag-state.util';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';

export const migrateLegacyAppData = (appData: AppDataComplete): AppDataComplete => {
  const newData = dirtyDeepCopy(appData);
  newData.project = migrateProjectState(newData.project);
  newData.task = migrateTaskState(newData.task);
  newData.tag = migrateTagState(newData.tag);
  newData.taskRepeatCfg = migrateTaskRepeatCfgState(newData.taskRepeatCfg);
  newData.globalConfig = migrateGlobalConfigState(newData.globalConfig);
  newData.metric = migrateMetricState(newData.metric);
  newData.improvement = migrateImprovementState(newData.improvement);
  newData.obstruction = migrateObstructionState(newData.obstruction);
  return crossModelMigrations(appData);
};
