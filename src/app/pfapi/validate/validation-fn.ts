import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import { ArchiveModel } from '../../features/time-tracking/time-tracking.model';
import { ProjectState } from '../../features/project/project.model';
import { TaskState } from '../../features/tasks/task.model';
import { validate } from 'typia';

export const validateArchiveModel = <R>(d: ArchiveModel | R): boolean =>
  typeof d === 'object' &&
  d !== null &&
  'task' in d &&
  isEntityStateConsistent(d.task) &&
  // validateTaskModel(d.task) &&
  typeof d.lastTimeTrackingFlush === 'number' &&
  typeof d.timeTracking.project === 'object' &&
  typeof d.timeTracking.tag === 'object';
// NOTE deep validation of all tasks might be too resource intensive

// export const validateProjectModel = <R>(d: ProjectState | R): boolean =>
//   typeof d === 'object' &&
//   d !== null &&
//   isEntityStateConsistent(d as any) &&
//   Object.values((d as ProjectState).entities).every((v) => validateSingleProject(v));

export const validateProjectModel = <R>(d: ProjectState | R): boolean => {
  const r = validate<ProjectState>(d);
  if (!r.success) {
    console.log('Validation failed', r.errors, r.data);
  }
  if (!isEntityStateConsistent(d as any)) {
    return false;
  }
  return r.success;
};

export const validateTaskModel = <R>(d: TaskState | R): boolean => {
  const r = validate<TaskState>(d);
  if (!r.success) {
    console.log('Validation failed', r.errors, r.data);
  }
  if (!isEntityStateConsistent(d as any)) {
    return false;
  }
  return r.success;
};

// const wrapValidate = <R>(d: R, isEntityCheck = false): boolean => {
//   const r = validate<R>(d);
//   if (!r.success) {
//     console.log('Validation failed', r.errors, r.data);
//   }
//   return r.success;
// };
