import { METRIC_MODEL_VERSION } from './metric.const';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/model-version';
import { MetricState } from './metric.model';
import { ObstructionState } from './obstruction/obstruction.model';
import { ImprovementState } from './improvement/improvement.model';
import { EntityState } from '@ngrx/entity';

const MODEL_VERSION = METRIC_MODEL_VERSION;

const migrateMetricStates = (modelName: string, defaultState: any) => (metricState: any): any => {
  if (!isMigrateModel(metricState, MODEL_VERSION, modelName)) {
    return metricState;
  }
  return {
    ...defaultState,
    ...mergeAllIntoOne(metricState),
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION,
  };
};

export const migrateMetricState: (metricState: MetricState) => MetricState = migrateMetricStates('Metric', {
  ids: [],
  entities: {}
});
export const migrateImprovementState: (improvementState: ImprovementState) => ImprovementState = migrateMetricStates('Improvement', {
  ids: [],
  entities: {}
});
export const migrateObstructionState: (obstructionState: ObstructionState) => ObstructionState = migrateMetricStates('Obstruction', {
  ids: [],
  entities: {}
});

function mergeAllIntoOne(projectStates: { [key: string]: EntityState<any> }): EntityState<any> {
  let allIds: string[] = [];
  const allEntities: any = {};

  if (projectStates.ids && projectStates.entities) {
    console.log('No migration necessary');
    return projectStates as any;
  }

  Object.keys(projectStates).forEach((pid: string) => {
    if (projectStates[pid] && Array.isArray(projectStates[pid].ids)) {
      const idsForProject = projectStates[pid].ids as string[];
      allIds = [...allIds, ...idsForProject];
      idsForProject.forEach(entityId => {
        allEntities[entityId] = projectStates[pid].entities[entityId];
      });
    }
  });

  console.log('MERGED_METRICS', {projectStates}, {
    ids: allIds,
    entities: allEntities,
  });

  return {
    ids: allIds,
    entities: allEntities,
  };
}
