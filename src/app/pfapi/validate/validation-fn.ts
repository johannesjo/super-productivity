import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import {
  ArchiveModel,
  TimeTrackingState,
} from '../../features/time-tracking/time-tracking.model';
import { ProjectState } from '../../features/project/project.model';
import { TaskState } from '../../features/tasks/task.model';
import { IValidation, validate } from 'typia';
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

export const validateAllData = <R>(d: AppDataCompleteNew | R): boolean => {
  // console.time('validateAllData');
  const r = _wrapValidate(validate<AppDataCompleteNew>(d));
  // console.timeEnd('validateAllData');
  // const dd = d as AppDataCompleteNew;
  // console.time('validateAllData2');
  // const r2 =
  //   validateProjectModel(dd.project) &&
  //   validateTagModel(dd.tag) &&
  //   validateTaskModel(dd.task) &&
  //   validateSimpleCounterModel(dd.simpleCounter) &&
  //   validateNoteModel(dd.note) &&
  //   validateTaskRepeatCfgStateModel(dd.taskRepeatCfg) &&
  //   validateReminderModel(dd.reminders) &&
  //   validatePlannerModel(dd.planner) &&
  //   validateBoardsModel(dd.boards) &&
  //   validateIssueProviderModel(dd.issueProvider) &&
  //   validateMetricModel(dd.metric) &&
  //   validateImprovementModel(dd.improvement) &&
  //   validateObstructionModel(dd.obstruction) &&
  //   validateGlobalConfigModel(dd.globalConfig) &&
  //   validateArchiveModel(dd.archiveYoung) &&
  //   validateArchiveModel(dd.archiveOld) &&
  //   validateTimeTrackingModel(dd.timeTracking);
  // console.timeEnd('validateAllData2');
  return r;
};

export const validateProjectModel = <R>(d: ProjectState | R): boolean => {
  return _wrapValidate(validate<ProjectState>(d), d, true);
};

export const validateTagModel = <R>(d: TagState | R): boolean => {
  return _wrapValidate(validate<TagState>(d), d, true);
};

export const validateTaskModel = <R>(d: TaskState | R): boolean => {
  return _wrapValidate(validate<TaskState>(d), d, true);
};

export const validateSimpleCounterModel = <R>(d: SimpleCounterState | R): boolean => {
  return _wrapValidate(validate<SimpleCounterState>(d), d, true);
};

export const validateNoteModel = <R>(d: NoteState | R): boolean => {
  return _wrapValidate(validate<NoteState>(d), d, true);
};

export const validateTaskRepeatCfgStateModel = <R>(
  d: TaskRepeatCfgState | R,
): boolean => {
  return _wrapValidate(validate<TaskRepeatCfgState>(d), d, true);
};
// -------------------------------

export const validateReminderModel = <R>(d: Reminder[] | R): boolean => {
  return _wrapValidate(validate<Reminder[]>(d));
};

export const validatePlannerModel = <R>(d: PlannerState | R): boolean => {
  return _wrapValidate(validate<PlannerState>(d));
};

export const validateBoardsModel = <R>(d: BoardsState | R): boolean => {
  return _wrapValidate(validate<BoardsState>(d));
};
// -------------------------------

// entity states
export const validateIssueProviderModel = <R>(d: IssueProviderState | R): boolean => {
  return _wrapValidate(validate<IssueProviderState>(d), d, true);
};

export const validateMetricModel = <R>(d: MetricState | R): boolean => {
  return _wrapValidate(validate<MetricState>(d), d, true);
};

export const validateImprovementModel = <R>(d: ImprovementState | R): boolean => {
  return _wrapValidate(validate<ImprovementState>(d), d, true);
};

export const validateObstructionModel = <R>(d: ObstructionState | R): boolean => {
  return _wrapValidate(validate<ObstructionState>(d), d, true);
};

// -------------------------------
export const validateGlobalConfigModel = <R>(d: GlobalConfigState | R): boolean => {
  return _wrapValidate(validate<GlobalConfigState>(d));
};

export const validateTimeTrackingModel = <R>(d: TimeTrackingState | R): boolean => {
  return _wrapValidate(validate<TimeTrackingState>(d));
};

// -------------------------------

export const validateArchiveModel = <R>(d: ArchiveModel | R): boolean => {
  const r = validate<ArchiveModel>(d);
  if (!r.success) {
    console.log('Validation failed', (r as any)?.errors, r.data);
  }
  if (!isEntityStateConsistent((d as ArchiveModel).task)) {
    return false;
  }
  return r.success;
};

const _wrapValidate = <R>(
  result: IValidation<any>,
  d?: R,
  isEntityCheck = false,
): boolean => {
  if (!result.success) {
    console.log('Validation failed', (result as any)?.errors, result.data);
  }
  return result.success && (!isEntityCheck || isEntityStateConsistent(d as any));
};
