import { AppBaseData, AppDataComplete, AppDataForProjects } from './sync.model';
import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import { devError } from '../../util/dev-error';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { Task } from '../../features/tasks/task.model';
import { IssueProvider } from '../../features/issue/issue.model';
import { environment } from '../../../environments/environment';

export const isValidAppData = (d: AppDataComplete): boolean => {
  const dAny: any = d;
  const isValid =
    typeof dAny === 'object' &&
    dAny !== null &&
    typeof dAny.note === 'object' &&
    dAny.note !== null &&
    typeof dAny.bookmark === 'object' &&
    dAny.bookmark !== null &&
    typeof dAny.improvement === 'object' &&
    dAny.improvement !== null &&
    typeof dAny.obstruction === 'object' &&
    dAny.obstruction !== null &&
    typeof dAny.metric === 'object' &&
    dAny.metric !== null &&
    typeof dAny.task === 'object' &&
    dAny.task !== null &&
    typeof dAny.tag === 'object' &&
    dAny.tag !== null &&
    typeof dAny.globalConfig === 'object' &&
    dAny.globalConfig !== null &&
    typeof dAny.taskArchive === 'object' &&
    dAny.taskArchive !== null &&
    // TODO add check later
    // typeof dAny.issueProvider === 'object' &&
    // dAny.issueProvider !== null &&
    typeof dAny.project === 'object' &&
    dAny.project !== null &&
    Array.isArray(d.reminders) &&
    _isEntityStatesConsistent(d) &&
    _isAllTasksAvailableAndListConsistent(d) &&
    _isAllNotesAvailableAndListConsistent(d) &&
    _isNoLonelySubTasks(d) &&
    _isNoMissingSubTasks(d) &&
    _isAllProjectsAvailableForTasks(d) &&
    _isAllProjectsAvailableForIssueProviders(d) &&
    _isAllTagsAvailable(d) &&
    _isAllRemindersAvailable(d) &&
    _isAllTasksHaveAProjectOrTag(d);

  // console.log({ isValid, d });
  return isValid;
};

let lastValidityError: string;
export const getLastValidityError = (): string | undefined => lastValidityError;
const _validityError = (errTxt: string, additionalInfo?: any): void => {
  if (additionalInfo) {
    console.log('Validity Error Info: ', additionalInfo);
  }
  devError(errTxt);
  lastValidityError = errTxt;
};

const _isAllRemindersAvailable = ({ reminders, task }: AppDataComplete): boolean => {
  if (environment.production) {
    // NOTE don't check for production, is it is not a big problem
    return true;
  }

  let isValid: boolean = true;
  task.ids.forEach((id: string) => {
    const t: Task = task.entities[id] as Task;
    if (t.reminderId && !reminders.find((r) => r.id === t.reminderId)) {
      console.log({ task: t, reminders });
      _validityError(`Missing reminder ${t.reminderId} from task not existing`, {
        t,
        reminders,
        task,
      });
      isValid = false;
    }
  });

  return isValid;
};

const _isAllProjectsAvailableForTasks = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  const pids = data.project.ids as string[];
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (t.projectId && !pids.includes(t.projectId)) {
      console.log(t);
      _validityError(`projectId ${t.projectId} from task not existing`, { t, data });
      isValid = false;
    }
  });
  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    if (t.projectId && !pids.includes(t.projectId)) {
      console.log(t);
      _validityError(`projectId ${t.projectId} from archive task not existing`, {
        t,
        data,
      });
      isValid = false;
    }
  });

  return isValid;
};

const _isAllProjectsAvailableForIssueProviders = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  const pids = data.project.ids as string[];
  data.issueProvider.ids.forEach((id: string) => {
    const ip: IssueProvider = data.issueProvider.entities[id] as IssueProvider;
    if (ip.defaultProjectId && !pids.includes(ip.defaultProjectId)) {
      console.log(ip);
      _validityError(
        `defaultProjectId ${ip.defaultProjectId} from issueProvider not existing`,
        { t: ip, data },
      );
      isValid = false;
    }
  });

  return isValid;
};

const _isAllTagsAvailable = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  const allTagIds = data.tag.ids as string[];
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    const missingTagId = t.tagIds.find((tagId) => !allTagIds.includes(tagId));
    if (missingTagId) {
      console.log(t);
      _validityError(`tagId "${missingTagId}" from task not existing`, { t, data });
      isValid = false;
    }
  });
  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    const missingTagId = t.tagIds.find((tagId) => !allTagIds.includes(tagId));
    if (missingTagId) {
      console.log(t);
      _validityError(`tagId "${missingTagId}" from task archive not existing`, {
        t,
        data,
      });
      isValid = false;
    }
  });

  return isValid;
};

const _isAllTasksHaveAProjectOrTag = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (!t.parentId && !t.projectId && !t.tagIds.length) {
      _validityError(`Task without project or tag`, { t, data });
      isValid = false;
    }
  });
  return isValid;
};

const _isAllTasksAvailableAndListConsistent = (data: AppDataComplete): boolean => {
  let allIds: string[] = [];
  let isInconsistentProjectId: boolean = false;
  let isMissingTaskData: boolean = false;

  (data.tag.ids as string[])
    .map((id) => data.tag.entities[id])
    .forEach((tag) => {
      if (!tag) {
        console.log(data.tag);
        _validityError('No tag', { tag, data });
        throw new Error('No tag');
      }
      allIds = allIds.concat(tag.taskIds);
    });

  (data.project.ids as string[])
    .map((id) => data.project.entities[id])
    .forEach((project) => {
      if (!project) {
        console.log(data.project);
        throw new Error('No project');
      }
      const allTaskIdsForProject: string[] = project.taskIds.concat(
        project.backlogTaskIds,
      );
      allIds = allIds.concat(allTaskIdsForProject);
      allTaskIdsForProject.forEach((tid) => {
        const task = data.task.entities[tid];
        if (!task) {
          isMissingTaskData = true;
          _validityError(
            'Missing task data (tid: ' + tid + ') for Project ' + project.title,
            { project, data },
          );
        } else if (task.projectId !== project.id) {
          isInconsistentProjectId = true;
          console.log('--------------------------------');
          console.log('tid', task.projectId, 'pid', project.id, { task, project });
          _validityError('Inconsistent task projectId', { task, project, data });
        }
      });
    });

  // check ids as well
  const idNotFound = allIds.find((id) => !data.task.ids.includes(id));
  if (idNotFound) {
    const tag = (data.tag.ids as string[])
      .map((id) => data.tag.entities[id])
      .find((tagI) => (tagI as Tag).taskIds.includes(idNotFound));

    const project = (data.project.ids as string[])
      .map((id) => data.project.entities[id])
      .find(
        (projectI) =>
          (projectI as Project).taskIds.includes(idNotFound) ||
          (projectI as Project).backlogTaskIds.includes(idNotFound),
      );

    _validityError(
      'Inconsistent Task State: Missing task id ' +
        idNotFound +
        ' for Project/Tag ' +
        ((tag as Tag) || (project as Project)).title,
      { tag, project, data },
    );
  }

  return !idNotFound && !isInconsistentProjectId && !isMissingTaskData;
};

const _isAllNotesAvailableAndListConsistent = (data: AppDataComplete): boolean => {
  let allIds: string[] = [];
  let isInconsistentProjectId: boolean = false;
  let isMissingNoteData: boolean = false;

  (data.project.ids as string[])
    .map((id) => data.project.entities[id])
    .forEach((project) => {
      if (!project) {
        console.log(data.project);
        throw new Error('No project');
      }
      const allNoteIdsForProject: string[] = project.noteIds;
      allIds = allIds.concat(allNoteIdsForProject);
      allNoteIdsForProject.forEach((tid) => {
        const note = data.note.entities[tid];
        if (!note) {
          isMissingNoteData = true;
          _validityError(
            'Missing note data (tid: ' + tid + ') for Project ' + project.title,
            { project, note, data },
          );
        } else if (note.projectId !== project.id) {
          isInconsistentProjectId = true;
          console.log('--------------------------------');
          console.log('nid', note.projectId, 'pid', project.id, { note, project });
          _validityError('Inconsistent note projectId', { project, note, data });
        }
      });
    });

  allIds = allIds.concat(data.note.todayOrder);

  // check ids as well
  const idNotFound = allIds.find((id) => !data.note.ids.includes(id));
  if (idNotFound) {
    const project = (data.project.ids as string[])
      .map((id) => data.project.entities[id])
      .find((projectI) => (projectI as Project).noteIds.includes(idNotFound));

    _validityError(
      'Inconsistent Note State: Missing note id ' +
        idNotFound +
        ' for Project ' +
        project?.title,
      { project, data },
    );
  }

  return !idNotFound && !isInconsistentProjectId && !isMissingNoteData;
};

const _isEntityStatesConsistent = (data: AppDataComplete): boolean => {
  const baseStateKeys: (keyof AppBaseData)[] = [
    'task',
    'taskArchive',
    'taskRepeatCfg',
    'tag',
    'project',
    'note',
    'simpleCounter',

    // TODO include later after everybody is migrated
    // 'metric',
    // 'improvement',
    // 'obstruction',
  ];
  const projectStateKeys: (keyof AppDataForProjects)[] = ['bookmark'];

  const brokenBaseItem = baseStateKeys.find((key) => {
    if (!isEntityStateConsistent(data[key], key)) {
      console.log(key, data[key]);
      _validityError('Inconsistent entity state for ' + key, { key, data });
      return true;
    }
    return false;
  });

  const brokenProjectItem = projectStateKeys.find((projectModelKey) => {
    const dataForProjects = data[projectModelKey];
    if (typeof (dataForProjects as any) !== 'object') {
      throw new Error('No dataForProjects');
    }
    return Object.keys(dataForProjects).find((projectId) => {
      // also allow undefined for project models
      if (
        (data as any)[projectId] !== undefined &&
        !isEntityStateConsistent(
          (data as any)[projectId],
          `${projectModelKey} pId:${projectId}`,
        )
      ) {
        console.log(projectModelKey, projectId, (data as any)[projectId]);
        _validityError('Inconsistent entity state for ' + projectModelKey, {
          projectId,
          projectModelKey,
          data,
        });
        return true;
      }
      return false;
    });
  });

  return !brokenBaseItem && !brokenProjectItem;
};

const _isNoLonelySubTasks = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (t.parentId && !data.task.entities[t.parentId]) {
      console.log(t);
      _validityError(`Inconsistent Task State: Lonely Sub Task in Today ${t.id}`, {
        t,
        data,
      });
      isValid = false;
    }
  });

  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    if (t.parentId && !data.taskArchive.entities[t.parentId]) {
      console.log(t);
      _validityError(`Inconsistent Task State: Lonely Sub Task in Archive ${t.id}`, {
        t,
        data,
      });
      isValid = false;
    }
  });

  return isValid;
};

const _isNoMissingSubTasks = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (t.subTaskIds.length) {
      t.subTaskIds.forEach((subId) => {
        if (!data.task.entities[subId]) {
          console.log(t);
          _validityError(
            `Inconsistent Task State: Missing sub task data in today ${subId}`,
            { t, data },
          );
          isValid = false;
        }
      });
    }
  });

  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    if (t.subTaskIds.length) {
      t.subTaskIds.forEach((subId) => {
        if (!data.taskArchive.entities[subId]) {
          console.log(t);
          _validityError(
            `Inconsistent Task State: Missing sub task data in archive ${subId}`,
            { t, data },
          );
          isValid = false;
        }
      });
    }
  });

  return isValid;
};
