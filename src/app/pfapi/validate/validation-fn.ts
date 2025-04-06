import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import { ArchiveModel } from '../../features/time-tracking/time-tracking.model';
import { Project, ProjectState } from '../../features/project/project.model';
import { TaskCopy, TaskState } from '../../features/tasks/task.model';

export const validateArchiveModel = <R>(d: ArchiveModel | R): boolean =>
  typeof d === 'object' &&
  d !== null &&
  'task' in d &&
  isEntityStateConsistent(d.task) &&
  typeof d.lastTimeTrackingFlush === 'number' &&
  typeof d.timeTracking.project === 'object' &&
  typeof d.timeTracking.tag === 'object';
// NOTE deep validation of all tasks might be too resource intensive

export const validateProjectModel = <R>(d: ProjectState | R): boolean =>
  typeof d === 'object' &&
  d !== null &&
  isEntityStateConsistent(d as any) &&
  Object.values((d as ProjectState).entities).every((v) => validateSingleProject(v));

const validateSingleProject = (project: Project | undefined): boolean => {
  return (
    !!project &&
    typeof project === 'object' &&
    typeof project.id === 'string' &&
    typeof project.title === 'string' &&
    typeof project.isEnableBacklog === 'boolean' &&
    Array.isArray(project.noteIds) &&
    Array.isArray(project.taskIds) &&
    Array.isArray(project.backlogTaskIds) &&
    typeof project.theme === 'object' &&
    typeof project.advancedCfg === 'object'
  );
};

export const validateTaskModel = <R>(d: TaskState | R): boolean =>
  typeof d === 'object' &&
  d !== null &&
  isEntityStateConsistent(d as any) &&
  Object.values((d as TaskState).entities).every((v) => validateSingleTask(v));

const validateSingleTask = (task: TaskCopy | undefined): boolean => {
  return (
    !!task &&
    typeof task === 'object' &&
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.notes === 'string' &&
    typeof task.timeSpent === 'number' &&
    typeof task.timeEstimate === 'number' &&
    typeof task.created === 'number' &&
    typeof task.isDone === 'boolean' &&
    Array.isArray(task.subTaskIds) &&
    Array.isArray(task.tagIds) &&
    typeof task.timeSpentOnDay === 'object'
  );
};
