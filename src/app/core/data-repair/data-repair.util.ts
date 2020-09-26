import { AppBaseDataEntityLikeStates, AppDataComplete } from '../../imex/sync/sync.model';
import { TagCopy } from '../../features/tag/tag.model';
import { ProjectCopy } from '../../features/project/project.model';

const ENTITY_STATE_KEYS: (keyof AppDataComplete)[] = ['task', 'taskArchive', 'taskRepeatCfg', 'tag', 'project', 'simpleCounter'];

export const dataRepair = (data: AppDataComplete): AppDataComplete => {
  // console.time('dataRepair');
  let dataOut: AppDataComplete = data;
  // let dataOut: AppDataComplete = dirtyDeepCopy(data);
  dataOut = _fixEntityStates(dataOut);
  dataOut = _removeMissingTasksFromListsOrRestoreFromArchive(dataOut);
  dataOut = _removeDuplicatesFromArchive(dataOut);
  dataOut = _addOrphanedTasksToProjectLists(dataOut);
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
    if (duplicateIds.length > 0) {
      console.log(duplicateIds.length + ' duplicates removed from archive.');
    }
  }
  return data;
};

const _removeMissingTasksFromListsOrRestoreFromArchive = (data: AppDataComplete): AppDataComplete => {
  const {task, project, tag, taskArchive} = data;
  const taskIds: string[] = task.ids;
  const taskArchiveIds: string[] = taskArchive.ids as string[];
  const taskIdsToRestoreFromArchive: string[] = [];

  project.ids.forEach((pId: string | number) => {
    const projectItem = project.entities[pId] as ProjectCopy;

    projectItem.taskIds = projectItem.taskIds.filter((id: string): boolean => {
      if (taskArchiveIds.includes(id)) {
        taskIdsToRestoreFromArchive.push(id);
        return true;
      }
      return taskIds.includes(id);
    });

    projectItem.backlogTaskIds = projectItem.backlogTaskIds.filter((id: string): boolean => {
      if (taskArchiveIds.includes(id)) {
        taskIdsToRestoreFromArchive.push(id);
        return true;
      }
      return taskIds.includes(id);
    });
  });

  tag.ids.forEach((tId: string | number) => {
    const tagItem = tag.entities[tId] as TagCopy;
    tagItem.taskIds = tagItem.taskIds.filter(id => taskIds.includes(id));
  });

  taskIdsToRestoreFromArchive.forEach(id => {
    task.entities[id] = taskArchive.entities[id];
    delete taskArchive.entities[id];
  });
  task.ids = [...taskIds, ...taskIdsToRestoreFromArchive];
  taskArchive.ids = taskArchiveIds.filter(id => !taskIdsToRestoreFromArchive.includes(id));

  if (taskIdsToRestoreFromArchive.length > 0) {
    console.log(taskIdsToRestoreFromArchive.length + ' missing tasks restored from archive.');
  }
  return data;
};

const _resetEntityIdsFromObjects = <T>(data: AppBaseDataEntityLikeStates): AppBaseDataEntityLikeStates => {
  return {
    ...data,
    ids: Object.keys(data.entities)
  };
};

const _addOrphanedTasksToProjectLists = (data: AppDataComplete): AppDataComplete => {
  const {task, project} = data;
  let allTaskIdsOnProjectLists: string[] = [];

  project.ids.forEach((pId: string | number) => {
    const projectItem = project.entities[pId] as ProjectCopy;
    allTaskIdsOnProjectLists = allTaskIdsOnProjectLists.concat(projectItem.taskIds, projectItem.backlogTaskIds);
  });
  const orphanedTaskIds: string[] = task.ids.filter(tid => {
    const taskItem = task.entities[tid];
    if (!taskItem) {
      throw new Error('Missing task');
    }
    return !taskItem.parentId && !allTaskIdsOnProjectLists.includes(tid) && taskItem.projectId;
  });

  orphanedTaskIds.forEach(tid => {
    const taskItem = task.entities[tid];
    if (!taskItem) {
      throw new Error('Missing task');
    }
    project.entities[taskItem.projectId as string]?.taskIds.push(tid);
  });

  if (orphanedTaskIds.length > 0) {
    console.log(orphanedTaskIds.length + ' orphaned tasks found & restored.');
  }

  return data;
};

