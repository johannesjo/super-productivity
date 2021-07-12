import { AppBaseData, AppDataComplete, AppDataForProjects } from './sync.model';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import { devError } from '../../util/dev-error';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { Task } from '../../features/tasks/task.model';

export const isValidAppData = (
  d: AppDataComplete,
  isSkipInconsistentTaskStateError = false,
): boolean => {
  const dAny: any = d;
  // TODO remove this later on
  const isCapableModelVersion =
    typeof dAny === 'object' &&
    d.project &&
    d.project[MODEL_VERSION_KEY] &&
    typeof d.project[MODEL_VERSION_KEY] === 'number' &&
    (d.project[MODEL_VERSION_KEY] as number) >= 5;

  // console.time('time isValidAppData');
  const isValid = isCapableModelVersion
    ? typeof dAny === 'object' &&
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
      typeof dAny.project === 'object' &&
      dAny.project !== null &&
      Array.isArray(d.reminders) &&
      _isEntityStatesConsistent(d) &&
      (isSkipInconsistentTaskStateError ||
        (_isAllTasksAvailableAndListConsistent(d) && _isNoLonelySubTasks(d))) &&
      _isAllProjectsAvailable(d) &&
      _isAllTagsAvailable(d) &&
      _isAllRemindersAvailable(d) &&
      _isAllTasksHaveAProjectOrTag(d)
    : typeof dAny === 'object';
  // console.timeEnd('time isValidAppData');

  console.log({ isValid, d });

  return isValid;
};

const _isAllRemindersAvailable = ({ reminders, task }: AppDataComplete): boolean => {
  let isValid: boolean = true;
  task.ids.forEach((id: string) => {
    const t: Task = task.entities[id] as Task;
    if (t.reminderId && !reminders.find((r) => r.id === t.reminderId)) {
      console.log({ task: t, reminders });
      devError(`Missing reminder ${t.reminderId} from task not existing`);
      isValid = false;
    }
  });

  return isValid;
};

const _isAllProjectsAvailable = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  const pids = data.project.ids as string[];
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (t.projectId && !pids.includes(t.projectId)) {
      console.log(t);
      devError(`projectId ${t.projectId} from task not existing`);
      isValid = false;
    }
  });
  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    if (t.projectId && !pids.includes(t.projectId)) {
      console.log(t);
      devError(`projectId ${t.projectId} from archive task not existing`);
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
      devError(`tagId "${missingTagId}" from task not existing`);
      isValid = false;
    }
  });
  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    const missingTagId = t.tagIds.find((tagId) => !allTagIds.includes(tagId));
    if (missingTagId) {
      console.log(t);
      devError(`tagId "${missingTagId}" from task archive not existing`);
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
      devError(`Task without project or tag`);
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
          devError('Missing task data (tid: ' + tid + ') for Project ' + project.title);
        } else if (task.projectId !== project.id) {
          isInconsistentProjectId = true;
          console.log({ task, project });
          devError('Inconsistent task projectId');
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

    devError(
      'Inconsistent Task State: Missing task id ' +
        idNotFound +
        ' for Project/Tag ' +
        ((tag as Tag) || (project as Project)).title,
    );
  }

  return !idNotFound && !isInconsistentProjectId && !isMissingTaskData;
};

const _isEntityStatesConsistent = (data: AppDataComplete): boolean => {
  const baseStateKeys: (keyof AppBaseData)[] = [
    'task',
    'taskArchive',
    'taskRepeatCfg',
    'tag',
    'project',
    'simpleCounter',

    // TODO include later after everybody is migrated
    // 'metric',
    // 'improvement',
    // 'obstruction',
  ];
  const projectStateKeys: (keyof AppDataForProjects)[] = ['note', 'bookmark'];

  const brokenItem =
    baseStateKeys.find((key) => !isEntityStateConsistent(data[key], key)) ||
    projectStateKeys.find((projectModelKey) => {
      const dataForProjects = data[projectModelKey];
      if (typeof (dataForProjects as any) !== 'object') {
        throw new Error('No dataForProjects');
      }
      return Object.keys(dataForProjects).find(
        (projectId) =>
          // also allow undefined for project models
          (data as any)[projectId] !== undefined &&
          !isEntityStateConsistent(
            (data as any)[projectId],
            `${projectModelKey} pId:${projectId}`,
          ),
      );
    });

  return !brokenItem;
};

const _isNoLonelySubTasks = (data: AppDataComplete): boolean => {
  let isValid: boolean = true;
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (t.parentId && !data.task.ids.includes(t.parentId)) {
      console.log(t);
      devError(`Inconsistent Task State: Lonely Sub Task in Today`);
      isValid = false;
    }
  });

  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    if (t.parentId && !data.taskArchive.ids.includes(t.parentId)) {
      console.log(t);
      devError(`Inconsistent Task State: Lonely Sub Task in Archive`);
      isValid = false;
    }
  });

  return isValid;
};
