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

export const validateProjectModel = <R>(
  d: ProjectState | R,
): ValidationResult<R | ProjectState> => {
  return _wrapValidate(validate<ProjectState>(d), d, true);
};

export const validateTagModel = <R>(d: TagState | R): ValidationResult<R | TagState> => {
  return _wrapValidate(validate<TagState>(d), d, true);
};

export const validateTaskModel = <R>(
  d: TaskState | R,
): ValidationResult<R | TaskState> => {
  return _wrapValidate(validate<TaskState>(d), d, true);
};

export const validateSimpleCounterModel = <R>(
  d: SimpleCounterState | R,
): ValidationResult<R | SimpleCounterState> => {
  return _wrapValidate(validate<SimpleCounterState>(d), d, true);
};

export const validateNoteModel = <R>(
  d: NoteState | R,
): ValidationResult<R | NoteState> => {
  return _wrapValidate(validate<NoteState>(d), d, true);
};

export const validateTaskRepeatCfgStateModel = <R>(
  d: TaskRepeatCfgState | R,
): ValidationResult<R | TaskRepeatCfgState> => {
  return _wrapValidate(validate<TaskRepeatCfgState>(d), d, true);
};
// -------------------------------

export const validateReminderModel = <R>(
  d: Reminder[] | R,
): ValidationResult<R | Reminder[]> => {
  return _wrapValidate(validate<Reminder[]>(d));
};

export const validatePlannerModel = <R>(
  d: PlannerState | R,
): ValidationResult<R | PlannerState> => {
  return _wrapValidate(validate<PlannerState>(d));
};

export const validateBoardsModel = <R>(
  d: BoardsState | R,
): ValidationResult<R | BoardsState> => {
  return _wrapValidate(validate<BoardsState>(d));
};
// -------------------------------

// entity states
export const validateIssueProviderModel = <R>(
  d: IssueProviderState | R,
): ValidationResult<R | IssueProviderState> => {
  return _wrapValidate(validate<IssueProviderState>(d), d, true);
};

export const validateMetricModel = <R>(
  d: MetricState | R,
): ValidationResult<R | MetricState> => {
  return _wrapValidate(validate<MetricState>(d), d, true);
};

export const validateImprovementModel = <R>(
  d: ImprovementState | R,
): ValidationResult<R | ImprovementState> => {
  return _wrapValidate(validate<ImprovementState>(d), d, true);
};

export const validateObstructionModel = <R>(
  d: ObstructionState | R,
): ValidationResult<R | ObstructionState> => {
  return _wrapValidate(validate<ObstructionState>(d), d, true);
};

// -------------------------------
export const validateGlobalConfigModel = <R>(
  d: GlobalConfigState | R,
): ValidationResult<R | GlobalConfigState> => {
  return _wrapValidate(validate<GlobalConfigState>(d));
};

export const validateTimeTrackingModel = <R>(
  d: TimeTrackingState | R,
): ValidationResult<R | TimeTrackingState> => {
  return _wrapValidate(validate<TimeTrackingState>(d));
};

// -------------------------------

export const validateArchiveModel = <R>(
  d: ArchiveModel | R,
): ValidationResult<ArchiveModel> => {
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
