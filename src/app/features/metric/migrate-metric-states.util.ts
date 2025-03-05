import { isMigrateModel } from '../../util/is-migrate-model';
import { MetricState } from './metric.model';
import { ObstructionState } from './obstruction/obstruction.model';
import { ImprovementState } from './improvement/improvement.model';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { MODEL_VERSION } from '../../core/model-version';

const migrateMetricStatesUtil =
  (modelName: string) =>
  (metricState: any): any => {
    if (!isMigrateModel(metricState, MODEL_VERSION.METRIC, modelName)) {
      return metricState;
    }
    return {
      ...metricState,
      // Update model version after all migrations ran successfully
      [MODEL_VERSION_KEY]: MODEL_VERSION.METRIC,
    };
  };

export const migrateMetricState: (metricState: MetricState) => MetricState =
  migrateMetricStatesUtil('Metric');
export const migrateImprovementState: (
  improvementState: ImprovementState,
) => ImprovementState = migrateMetricStatesUtil('Improvement');
export const migrateObstructionState: (
  obstructionState: ObstructionState,
) => ObstructionState = migrateMetricStatesUtil('Obstruction');
