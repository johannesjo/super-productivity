import { METRIC_MODEL_VERSION } from './metric.const';
import { isMigrateModel } from '../../util/model-version';
import { MetricState } from './metric.model';
import { ObstructionState } from './obstruction/obstruction.model';
import { ImprovementState } from './improvement/improvement.model';
import { MODEL_VERSION_KEY } from '../../app.constants';

const MODEL_VERSION = METRIC_MODEL_VERSION;

const migrateMetricStatesUtil =
  (modelName: string) =>
  (metricState: any): any => {
    if (!isMigrateModel(metricState, MODEL_VERSION, modelName)) {
      return metricState;
    }
    return {
      ...metricState,
      // Update model version after all migrations ran successfully
      [MODEL_VERSION_KEY]: MODEL_VERSION,
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
