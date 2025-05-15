import { devError } from '../../util/dev-error';
import { environment } from '../../../environments/environment';
import { AppDataCompleteNew } from '../pfapi-config';

let errorCount = 0;
let lastValidityError: string;

export const isRelatedModelDataValid = (d: AppDataCompleteNew): boolean => {
  errorCount = 0;

  // Extract commonly used collections once
  const projectIds = new Set<string>(d.project.ids as string[]);
  const tagIds = new Set<string>(d.tag.ids as string[]);
  const taskIds = new Set<string>(d.task.ids as string[]);
  const archiveTaskIds = new Set<string>(d.archiveYoung.task.ids as string[]);
  const noteIds = new Set<string>(d.note.ids as string[]);

  // Validate projects, tasks and tags relationships
  if (!validateTasksToProjectsAndTags(d, projectIds, tagIds, taskIds, archiveTaskIds)) {
    return false;
  }

  // Validate note relationships
  if (!validateNotes(d, projectIds, noteIds)) {
    return false;
  }

  // Validate subtasks
  if (!validateSubTasks(d, taskIds, archiveTaskIds)) {
    return false;
  }

  // Validate issue providers
  if (!validateIssueProviders(d, projectIds)) {
    return false;
  }

  // Validate reminders
  if (!validateReminders(d)) {
    return false;
  }

  return true;
};

export const getLastValidityError = (): string | undefined => lastValidityError;

const _validityError = (errTxt: string, additionalInfo?: any): void => {
  if (additionalInfo) {
    console.log('Validity Error Info: ', additionalInfo);
    if (environment.production) {
      try {
        console.log('Validity Error Info string: ', JSON.stringify(additionalInfo));
      } catch (e) {}
    }
  }
  if (errorCount <= 3) {
    devError(errTxt);
  } else {
    if (errorCount === 4) {
      console.warn('too many validity errors, only logging from now on');
    }
    console.error(errTxt);
  }
  lastValidityError = errTxt;
  errorCount++;
};

const validateTasksToProjectsAndTags = (
  d: AppDataCompleteNew,
  projectIds: Set<string>,
  tagIds: Set<string>,
  taskIds: Set<string>,
  archiveTaskIds: Set<string>,
): boolean => {
  // Track project-task relationships and ids for consistency validation
  const projectTaskMap = new Map<string, Set<string>>();

  // Validate tasks in projects
  for (const pid of d.project.ids) {
    const project = d.project.entities[pid];
    if (!project) {
      _validityError('No project', { pid, d });
      return false;
    }

    // Create entry for this project
    const projectTaskSet = new Set<string>([
      ...project.taskIds,
      ...project.backlogTaskIds,
    ]);
    projectTaskMap.set(project.id, projectTaskSet);

    // Validate each task in this project
    for (const tid of projectTaskSet) {
      const task = d.task.entities[tid];
      if (!task) {
        _validityError(`Missing task data (tid: ${tid}) for Project ${project.title}`, {
          project,
          d,
        });
        return false;
      }

      if (task.projectId !== project.id) {
        _validityError('Inconsistent task projectId', { task, project, d });
        return false;
      }
    }
  }

  // Validate projects in tasks
  for (const tid of d.task.ids) {
    const task = d.task.entities[tid];
    if (!task) continue;

    // Check project reference
    if (task.projectId && !projectIds.has(task.projectId)) {
      _validityError(`projectId ${task.projectId} from task not existing`, { task, d });
      return false;
    }

    // Check tag references
    for (const tagId of task.tagIds) {
      if (!tagIds.has(tagId)) {
        _validityError(`tagId "${tagId}" from task not existing`, { task, d });
        return false;
      }
    }

    // Check if task has project or tag
    if (!task.parentId && !task.projectId && task.tagIds.length === 0) {
      _validityError(`Task without project or tag`, { task, d });
      return false;
    }
  }

  // Similar validation for archive tasks
  for (const tid of d.archiveYoung.task.ids) {
    const task = d.archiveYoung.task.entities[tid];
    if (!task) continue;

    if (task.projectId && !projectIds.has(task.projectId)) {
      _validityError(`projectId ${task.projectId} from archive task not existing`, {
        task,
        d,
      });
      return false;
    }

    for (const tagId of task.tagIds) {
      if (!tagIds.has(tagId)) {
        _validityError(`tagId "${tagId}" from task archive not existing`, { task, d });
        return false;
      }
    }
  }

  // Check tags-tasks relationship
  for (const tagId of d.tag.ids) {
    const tag = d.tag.entities[tagId];
    if (!tag) continue;

    for (const tid of tag.taskIds) {
      if (!taskIds.has(tid)) {
        _validityError(
          `Inconsistent Task State: Missing task id ${tid} for Tag ${tag.title}`,
          { tag, d },
        );
        return false;
      }
    }
  }

  return true;
};

const validateNotes = (
  d: AppDataCompleteNew,
  projectIds: Set<string>,
  noteIds: Set<string>,
): boolean => {
  // Validate notes in projects
  for (const pid of d.project.ids) {
    const project = d.project.entities[pid];
    if (!project) continue;

    for (const nid of project.noteIds) {
      const note = d.note.entities[nid];
      if (!note) {
        _validityError(`Missing note data (tid: ${nid}) for Project ${project.title}`, {
          project,
          d,
        });
        return false;
      }

      if (note.projectId !== project.id) {
        _validityError('Inconsistent note projectId', { note, project, d });
        return false;
      }
    }
  }

  // Validate todayOrder list
  for (const nid of d.note.todayOrder) {
    if (!noteIds.has(nid)) {
      _validityError(
        `Inconsistent Note State: Missing note id ${nid} for note.todayOrder`,
        { d },
      );
      return false;
    }
  }

  return true;
};

const validateSubTasks = (
  d: AppDataCompleteNew,
  taskIds: Set<string>,
  archiveTaskIds: Set<string>,
): boolean => {
  // Check for lonely sub tasks and missing sub tasks in active tasks
  for (const tid of taskIds) {
    const task = d.task.entities[tid];
    if (!task) continue;

    // Check if parent exists
    if (task.parentId && !d.task.entities[task.parentId]) {
      _validityError(`Inconsistent Task State: Lonely Sub Task in Today ${task.id}`, {
        task,
        d,
      });
      return false;
    }

    // Check if all subtasks exist
    for (const subId of task.subTaskIds) {
      if (!d.task.entities[subId]) {
        _validityError(
          `Inconsistent Task State: Missing sub task data in today ${subId}`,
          { task, d },
        );
        return false;
      }
    }
  }

  // Same for archive tasks
  for (const tid of archiveTaskIds) {
    const task = d.archiveYoung.task.entities[tid];
    if (!task) continue;

    if (task.parentId && !d.archiveYoung.task.entities[task.parentId]) {
      _validityError(`Inconsistent Task State: Lonely Sub Task in Archive ${task.id}`, {
        task,
        d,
      });
      return false;
    }

    for (const subId of task.subTaskIds) {
      if (!d.archiveYoung.task.entities[subId]) {
        _validityError(
          `Inconsistent Task State: Missing sub task data in archive ${subId}`,
          { task, d },
        );
        return false;
      }
    }
  }

  return true;
};

const validateIssueProviders = (
  d: AppDataCompleteNew,
  projectIds: Set<string>,
): boolean => {
  for (const ipId of d.issueProvider.ids) {
    const ip = d.issueProvider.entities[ipId];
    if (ip && ip.defaultProjectId && !projectIds.has(ip.defaultProjectId)) {
      _validityError(
        `defaultProjectId ${ip.defaultProjectId} from issueProvider not existing`,
        { ip, d },
      );
      return false;
    }
  }
  return true;
};

const validateReminders = (d: AppDataCompleteNew): boolean => {
  if (environment.production) {
    // NOTE don't check for production, is it is not a big problem
    return true;
  }

  // Convert reminders to a Set for faster lookup
  const reminderIds = new Set(d.reminders.map((r) => r.id));

  for (const tid of d.task.ids) {
    const task = d.task.entities[tid];
    if (task && task.reminderId && !reminderIds.has(task.reminderId)) {
      _validityError(`Missing reminder ${task.reminderId} from task not existing`, {
        task,
        d,
      });
      return false;
    }
  }

  return true;
};
