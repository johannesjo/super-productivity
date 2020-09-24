import { AppBaseDataEntityLikeStates, AppDataComplete } from '../../imex/sync/sync.model';
import { TagCopy } from '../../features/tag/tag.model';
import { ProjectCopy } from '../../features/project/project.model';

const ENTITY_STATE_KEYS: (keyof AppDataComplete)[] = ['task', 'taskArchive', 'taskRepeatCfg', 'tag', 'project', 'simpleCounter'];

export const dataRepair = (data: AppDataComplete): AppDataComplete => {
  // console.time('dataRepair');
  let dataOut: AppDataComplete = data;
  // let dataOut: AppDataComplete = dirtyDeepCopy(data);
  dataOut = _fixEntityStates(dataOut);
  dataOut = _removeDuplicatesFromArchive(dataOut);
  dataOut = _removeMissingIdsFromLists(dataOut);
  // console.timeEnd('dataRepair');
  return dataOut;
};

const _fixEntityStates = (data: AppDataComplete): AppDataComplete => {
  ENTITY_STATE_KEYS.forEach((key) => {
    data[key] = _resetEntityIdsFromObjects(data[key] as AppBaseDataEntityLikeStates) as any;
  });

  return data;
};

const _removeDuplicatesFromArchive = (data: AppDataComplete): AppDataComplete => {
  const taskIds = data.task.ids as string[];
  const archiveTaskIds = data.taskArchive.ids as string[];
  const duplicateIds = taskIds.filter((id) => archiveTaskIds.includes(id));

  if (duplicateIds.length) {
    data.taskArchive.ids = archiveTaskIds.filter(id => !duplicateIds.includes(id));
    duplicateIds.forEach(id => {
      if (data.taskArchive.entities[id]) {
        delete data.taskArchive.entities[id];
      }
    });
  }
  return data;
};

const _removeMissingIdsFromLists = (data: AppDataComplete): AppDataComplete => {
  const {task, project, tag} = data;

  project.ids.forEach(() => {
  });

  project.ids.forEach((pId: string | number) => {
    const projectItem = project.entities[pId] as ProjectCopy;
    projectItem.taskIds = projectItem.taskIds.filter(id => task.ids.includes(id));
    projectItem.backlogTaskIds = projectItem.backlogTaskIds.filter(id => task.ids.includes(id));
  });
  tag.ids.forEach((tId: string | number) => {
    const tagItem = tag.entities[tId] as TagCopy;
    tagItem.taskIds = tagItem.taskIds.filter(id => task.ids.includes(id));
  });

  return data;
};

const _resetEntityIdsFromObjects = <T>(data: AppBaseDataEntityLikeStates): AppBaseDataEntityLikeStates => {
  return {
    ...data,
    ids: Object.keys(data.entities)
  };
};
