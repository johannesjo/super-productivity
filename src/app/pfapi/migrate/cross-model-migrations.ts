import { AppDataCompleteNew } from '../pfapi-config';
import { AppDataCompleteLegacy } from '../../imex/sync/sync.model';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn, CrossModelMigrations } from '../api';
/* eslint-disable @typescript-eslint/naming-convention */

export const CROSS_MODEL_MIGRATIONS: CrossModelMigrations = {
  2: ((fullData: AppDataCompleteLegacy): AppDataCompleteNew => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lastLocalSyncModelChange, lastArchiveUpdate, ...copy } =
      dirtyDeepCopy(fullData);

    // TODO migrate project.workStart and project.workEnd and project.breakNr and project.breakTime to timeTracking
    // TODO migrate tag.workStart and tag.workEnd and tag.breakNr and tag.breakTime to timeTracking

    return {
      ...copy,
      timeTracking: {
        project: {},
        tag: {},
        lastFlush: 0,
      },
      archive: {
        task: copy.taskArchive,
        timeTracking: {
          project: {},
          tag: {},
          lastFlush: 0,
        },
      },
      archiveOld: {
        task: { ids: [], entities: {} },
        timeTracking: {
          project: {},
          tag: {},
          lastFlush: 0,
        },
      },
    };
  }) as CrossModelMigrateFn,
} as const;
