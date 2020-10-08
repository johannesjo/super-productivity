import { AppBaseData, AppDataComplete, AppDataForProjects } from './sync.model';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import { devError } from '../../util/dev-error';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { Task } from '../../features/tasks/task.model';

export const isValidAppData = (d: AppDataComplete, isSkipInconsistentTaskStateError = false): boolean => {
  const dAny: any = d;
  // TODO remove this later on
  const isCapableModelVersion =
    (typeof dAny === 'object')
    && d.project
    && d.project[MODEL_VERSION_KEY]
    && typeof d.project[MODEL_VERSION_KEY] === 'number'
    && (d.project[MODEL_VERSION_KEY] as number) >= 5;

  // console.time('time isValidAppData');
  const isValid = (isCapableModelVersion)

    ? (typeof dAny === 'object') && dAny !== null
    && typeof dAny.note === 'object' && dAny.note !== null
    && typeof dAny.bookmark === 'object' && dAny.bookmark !== null
    && typeof dAny.improvement === 'object' && dAny.improvement !== null
    && typeof dAny.obstruction === 'object' && dAny.obstruction !== null
    && typeof dAny.metric === 'object' && dAny.metric !== null
    && typeof dAny.task === 'object' && dAny.task !== null
    && typeof dAny.tag === 'object' && dAny.tag !== null
    && typeof dAny.globalConfig === 'object' && dAny.globalConfig !== null
    && typeof dAny.taskArchive === 'object' && dAny.taskArchive !== null
    && typeof dAny.project === 'object' && dAny.project !== null
    && Array.isArray(d.reminders)
    && _isEntityStatesConsistent(d)
    && (isSkipInconsistentTaskStateError ||
      _isAllTasksAvailable(d)
      && _isNoLonelySubTasks(d)
    )

    : typeof dAny === 'object'
  ;
  // console.timeEnd('time isValidAppData');

  return isValid;
};

const _isAllTasksAvailable = (data: AppDataComplete): boolean => {
  let allIds: string [] = [];

  (data.tag.ids as string[])
    .map(id => data.tag.entities[id])
    .forEach((tag) => {
      if (!tag) {
        console.log(data.tag);
        throw new Error('No tag');
      }
      allIds = allIds.concat(tag.taskIds);
    });

  (data.project.ids as string[])
    .map(id => data.project.entities[id])
    .forEach(project => {
        if (!project) {
          console.log(data.project);
          throw new Error('No project');
        }
        allIds = allIds
          .concat(project.taskIds)
          .concat(project.backlogTaskIds);
      }
    );

  const notFound = allIds.find(id => !(data.task.ids.includes(id)));
  if (notFound) {
    const tag = (data.tag.ids as string[])
      .map(id => data.tag.entities[id])
      .find(tagI => (tagI as Tag).taskIds.includes(notFound));

    const project = (data.project.ids as string[])
      .map(id => data.project.entities[id])
      .find(projectI => (projectI as Project).taskIds.includes(notFound) || (projectI as Project).backlogTaskIds.includes(notFound));

    devError('Inconsistent Task State: Missing task id ' + notFound + ' for Project/Tag ' + ((tag as Tag) || (project as Project)).title);
  }
  return !notFound;
};

const _isEntityStatesConsistent = (data: AppDataComplete): boolean => {
  const baseStateKeys: (keyof AppBaseData)[] = [
    'task',
    'taskArchive',
    'taskRepeatCfg',
    'tag',
    'project',
    'simpleCounter',
  ];
  const projectStateKeys: (keyof AppDataForProjects)[] = [
    'note',
    'bookmark',
    'metric',
    'improvement',
    'obstruction',
  ];

  const brokenItem =
    baseStateKeys.find(key => !isEntityStateConsistent(data[key], key))
    ||
    projectStateKeys.find(projectModelKey => {
      const dataForProjects = data[projectModelKey];
      if (typeof (dataForProjects as any) !== 'object') {
        throw new Error('No dataForProjects');
      }
      return Object.keys(dataForProjects).find(projectId =>
        // also allow undefined for project models
        (((data as any)[projectId]) !== undefined)
        &&
        (!isEntityStateConsistent((data as any)[projectId], `${projectModelKey} pId:${projectId}`))
      );
    });

  return !brokenItem;
};

const _isNoLonelySubTasks = (data: AppDataComplete): boolean => {
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (t.parentId && !data.task.ids.includes(t.parentId)) {
      console.log(t);
      throw new Error(`Inconsistent Task State: Lonely Sub Task in Today`);
    }
  });

  data.taskArchive.ids.forEach((id: string) => {
    const t: Task = data.taskArchive.entities[id] as Task;
    if (t.parentId && !data.taskArchive.ids.includes(t.parentId)) {
      console.log(t);
      throw new Error(`Inconsistent Task State: Lonely Sub Task in Archive`);
    }
  });

  return true;
};
