import { AppBaseDataEntityLikeStates, AppDataComplete } from '../../imex/sync/sync.model';

const ENTITY_STATE_KEYS: (keyof AppDataComplete)[] = ['task', 'taskArchive', 'taskRepeatCfg', 'tag', 'project', 'simpleCounter'];

export const dataRepair = (data: AppDataComplete): AppDataComplete => {
  // console.time('dataRepair');
  let dataOut: AppDataComplete = data;
  dataOut = _fixEntityStates(dataOut);
  // dataOut = _removeDuplicatesFromArchive(dataOut);
  // console.timeEnd('dataRepair');
  return dataOut;
};

const _fixEntityStates = (data: AppDataComplete): AppDataComplete => {
  ENTITY_STATE_KEYS.forEach((key) => {
    data[key] = _resetEntityIdsFromObjects(data[key] as AppBaseDataEntityLikeStates) as any;
  });

  return data;
};

//
// const _fixEntityStates = (data: AppDataComplete): AppDataComplete => {
//   console.time('_removeDuplicatesFromArchive');
//   const taskIds = data.task.ids as string[];
//   const archiveTaskIds = data.taskArchive.ids as string[];
//   const duplicateIds = taskIds.filter((id) => archiveTaskIds.includes(id));
//   if (duplicateIds.length) {
//     data.taskArchive.ids = archiveTaskIds.filter(id => duplicateIds.includes(id));
//   }
//
//   console.timeEnd('_removeDuplicatesFromArchive');
//   return data;
// };

// const _removeDuplicatesFromArchive = (data: AppDataComplete): AppDataComplete => {
//   return data;
// };
//
// const _removeDuplicatesFromArchive = (data: AppDataComplete): AppDataComplete => {
//   return data;
// };

// const _makeEntityIdsUnique = <T>(data: AppBaseDataEntityLikeStates): AppBaseDataEntityLikeStates => {
//   return {
//     ...data,
//     ids: unique(data.ids as any) as any
//   };
// };

const _resetEntityIdsFromObjects = <T>(data: AppBaseDataEntityLikeStates): AppBaseDataEntityLikeStates => {
  return {
    ...data,
    ids: Object.keys(data.entities)
  };
};
