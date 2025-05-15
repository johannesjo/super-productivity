import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { TODAY_TAG } from '../../features/tag/tag.const';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_1: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  // throw new Error('Migration 4 is not implemented yet');
  console.log('____________________Migrate4.1__________________');
  const copy = fullData;

  Object.keys(copy.taskRepeatCfg.entities).forEach((id) => {
    const repeatCfg = copy.taskRepeatCfg.entities[id]!;
    if (repeatCfg.tagIds.includes(TODAY_TAG.id)) {
      // @ts-ignore
      repeatCfg.tagIds = repeatCfg.tagIds.filter((value) => value !== TODAY_TAG.id);
    }
  });

  // @ts-ignore
  // copy.tag.entities[TODAY_TAG.id].taskIds = [];

  console.log(copy);
  return copy;
}) as CrossModelMigrateFn;
