import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import {
  ArchiveModel,
  TimeTrackingState,
} from '../../features/time-tracking/time-tracking.model';
import { ProjectState } from '../../features/project/project.model';
import { TaskState } from '../../features/tasks/task.model';
import { validate } from 'typia';
import { TagState } from '../../features/tag/tag.model';
import { SimpleCounterState } from '../../features/simple-counter/simple-counter.model';
import { Reminder } from '../../features/reminder/reminder.model';
import { PlannerState } from '../../features/planner/store/planner.reducer';
import { NoteState } from '../../features/note/note.model';
import { TaskRepeatCfgState } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { BoardsState } from '../../features/boards/store/boards.reducer';
import { IssueProviderState } from '../../features/issue/issue.model';
import { MetricState } from '../../features/metric/metric.model';
import { ImprovementState } from '../../features/metric/improvement/improvement.model';
import { ObstructionState } from '../../features/metric/obstruction/obstruction.model';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { AppDataCompleteNew } from '../pfapi-config';
import { ValidationResult } from '../api/pfapi.model';

// for more speed
// type DataToValidate = Omit<AppDataCompleteNew, 'archiveOld' | 'archiveYoung'>;
// to test broken validation
// type DataToValidate = AppDataCompleteNew & {
//   NOT_THERE: boolean;
// };
type DataToValidate = AppDataCompleteNew;

export const validateAllData = <R>(
  d: AppDataCompleteNew | R,
): ValidationResult<AppDataCompleteNew> => {
  const r = _wrapValidate(validate<DataToValidate>(d));
  return r as ValidationResult<AppDataCompleteNew>;
};

/**
 * Maps each property of AppDataCompleteNew to its corresponding validation function
 */
export const appDataValidators: {
  [K in keyof AppDataCompleteNew]: <R>(
    data: AppDataCompleteNew[K] | R,
  ) => ValidationResult<AppDataCompleteNew[K] | R>;
} = {
  task: <R>(d: R | TaskState) => _wrapValidate(validate<TaskState>(d), d, true),
  taskRepeatCfg: <R>(d: R | TaskRepeatCfgState) =>
    _wrapValidate(validate<TaskRepeatCfgState>(d), d, true),
  archiveYoung: <R>(d: R | ArchiveModel) => validateArchiveModel(d),
  archiveOld: <R>(d: R | ArchiveModel) => validateArchiveModel(d),
  project: <R>(d: R | ProjectState) => _wrapValidate(validate<ProjectState>(d), d, true),
  tag: <R>(d: R | TagState) => _wrapValidate(validate<TagState>(d), d, true),
  simpleCounter: <R>(d: R | SimpleCounterState) =>
    _wrapValidate(validate<SimpleCounterState>(d), d, true),
  note: (d) => _wrapValidate(validate<NoteState>(d), d, true),
  reminders: <R>(d: R | Reminder[]) => _wrapValidate(validate<Reminder[]>(d)),
  planner: <R>(d: R | PlannerState) => _wrapValidate(validate<PlannerState>(d)),
  boards: <R>(d: R | BoardsState) => _wrapValidate(validate<BoardsState>(d)),
  issueProvider: (d) => _wrapValidate(validate<IssueProviderState>(d), d, true),
  metric: <R>(d: R | MetricState) => _wrapValidate(validate<MetricState>(d), d, true),
  improvement: <R>(d: R | ImprovementState) =>
    _wrapValidate(validate<ImprovementState>(d), d, true),
  obstruction: <R>(d: R | ObstructionState) =>
    _wrapValidate(validate<ObstructionState>(d), d, true),
  globalConfig: <R>(d: R | GlobalConfigState) =>
    _wrapValidate(validate<GlobalConfigState>(d)),
  timeTracking: <R>(d: R | TimeTrackingState) =>
    _wrapValidate(validate<TimeTrackingState>(d)),
} as const;

const validateArchiveModel = <R>(d: ArchiveModel | R): ValidationResult<ArchiveModel> => {
  const r = validate<ArchiveModel>(d);
  if (!r.success) {
    console.log('Validation failed', (r as any)?.errors, r.data);
  }
  if (!isEntityStateConsistent((d as ArchiveModel).task)) {
    return {
      success: false,
      data: d,
      errors: [{ expected: 'Valid Entity State', path: '.', value: d }],
    };
  }
  return r;
};

/**
 * Validates a specific property of the app data
 */
export const validateAppDataProperty = <K extends keyof AppDataCompleteNew>(
  key: K,
  data: AppDataCompleteNew[K],
): ValidationResult<AppDataCompleteNew[K]> => {
  return appDataValidators[key](data);
};

const _wrapValidate = <R>(
  result: ValidationResult<R>,
  d?: R,
  isEntityCheck = false,
): ValidationResult<R> => {
  if (!result.success) {
    console.log('Validation failed', (result as any)?.errors, result);
  }
  if (isEntityCheck && !isEntityStateConsistent(d as any)) {
    return {
      success: false,
      data: d,
      errors: [{ expected: 'Valid Entity State', path: '.', value: d }],
    };
  }

  return result;
};
