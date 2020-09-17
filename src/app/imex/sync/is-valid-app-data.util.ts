import { AppBaseData, AppDataComplete, AppDataForProjects } from './sync.model';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isEntityStateConsistent } from '../../util/check-fix-entity-state-consistency';
import { devError } from '../../util/dev-error';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';

// TODO unit test this
export const isValidAppData = (data: AppDataComplete, isSkipInconsistentTaskStateError = false): boolean => {
  // TODO remove this later on
  const isCapableModelVersion =
    (typeof (data as any) === 'object')
    && data.project
    && data.project[MODEL_VERSION_KEY]
    && typeof data.project[MODEL_VERSION_KEY] === 'number'
    && (data.project[MODEL_VERSION_KEY] as number) >= 5;

  // console.time('time isValidAppData');
  const isValid = (isCapableModelVersion)

    ? (typeof (data as any) === 'object')
    && typeof (data as any).note === 'object'
    && typeof (data as any).bookmark === 'object'
    && typeof (data as any).improvement === 'object'
    && typeof (data as any).obstruction === 'object'
    && typeof (data as any).metric === 'object'
    && typeof (data as any).task === 'object'
    && typeof (data as any).tag === 'object'
    && typeof (data as any).globalConfig === 'object'
    && typeof (data as any).taskArchive === 'object'
    && typeof (data as any).project === 'object'
    && Array.isArray(data.reminders)
    && _isEntityStatesConsistent(data)
    && _isTaskIdsConsistent(data, isSkipInconsistentTaskStateError)

    : typeof (data as any) === 'object'
  ;
  // console.timeEnd('time isValidAppData');

  return isValid;
};

const _isTaskIdsConsistent = (data: AppDataComplete, isSkipInconsistentTaskStateError = false): boolean => {
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

  if (notFound && !isSkipInconsistentTaskStateError) {
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
    'tag',
    'project',
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
      if (typeof dataForProjects !== 'object') {
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
