import { AppDataCompleteLegacy } from '../../imex/sync/sync.model';
import { AppDataCompleteNew } from '../pfapi-config';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn } from '../api';
import { TTWorkContextSessionMap } from '../../features/time-tracking/time-tracking.model';
import { ProjectCopy } from '../../features/project/project.model';
import { TagCopy } from '../../features/tag/tag.model';

export const crossModelMigration2: CrossModelMigrateFn = ((
  fullData: AppDataCompleteLegacy,
): AppDataCompleteNew => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lastLocalSyncModelChange, lastArchiveUpdate, taskArchive, ...copy } =
    dirtyDeepCopy(fullData);

  if (
    (fullData as any).archive &&
    (fullData as any).archiveOld &&
    (fullData as any).timeTracking &&
    (fullData as any).timeTracking.project &&
    Object.keys((fullData as any).timeTracking.project).length
  ) {
    // If time tracking is already migrated, return the original data
    console.warn('already migrated despite old model version!!!');
    return fullData as any as AppDataCompleteNew;
  }
  console.log(':::::::::::crossModelMigration2::::::::::::::');

  // Migrate project time tracking data
  const projectTimeTracking: TTWorkContextSessionMap = Object.keys(
    copy.project.entities,
  ).reduce((acc, projectId) => {
    const project = copy.project.entities[projectId] as ProjectCopy;
    acc[projectId] = {};

    Object.keys(project.workStart || {}).forEach((date) => {
      acc[projectId][date] = {
        ...acc[projectId][date],
        s: project.workStart![date],
      };
    });
    Object.keys(project.workEnd || {}).forEach((date) => {
      acc[projectId][date] = {
        ...acc[projectId][date],
        e: project.workEnd![date],
      };
    });
    Object.keys(project.breakNr || {}).forEach((date) => {
      acc[projectId][date] = {
        ...acc[projectId][date],
        b: project.breakNr![date],
      };
    });
    Object.keys(project.breakTime || {}).forEach((date) => {
      acc[projectId][date] = {
        ...acc[projectId][date],
        bt: project.breakTime![date],
      };
    });

    // @ts-ignore
    delete copy.project.entities[projectId]!.workStart!;
    // @ts-ignore
    delete copy.project.entities[projectId]!.workEnd!;
    // @ts-ignore
    delete copy.project.entities[projectId]!.breakTime!;
    // @ts-ignore
    delete copy.project.entities[projectId]!.breakNr!;

    return acc;
  }, {} as TTWorkContextSessionMap);

  // Migrate tag time tracking data
  const tagTimeTracking: TTWorkContextSessionMap = Object.keys(copy.tag.entities).reduce(
    (acc, tagId) => {
      const tag = copy.tag.entities[tagId] as TagCopy;
      acc[tagId] = {};

      Object.keys(tag.workStart || {}).forEach((date) => {
        acc[tagId][date] = {
          ...acc[tagId][date],
          s: tag.workStart![date],
        };
      });
      Object.keys(tag.workEnd || {}).forEach((date) => {
        acc[tagId][date] = {
          ...acc[tagId][date],
          e: tag.workEnd![date],
        };
      });
      Object.keys(tag.breakNr || {}).forEach((date) => {
        acc[tagId][date] = {
          ...acc[tagId][date],
          b: tag.breakNr![date],
        };
      });
      Object.keys(tag.breakTime || {}).forEach((date) => {
        acc[tagId][date] = {
          ...acc[tagId][date],
          bt: tag.breakTime![date],
        };
      });

      // @ts-ignore
      delete copy.tag.entities[tagId]!.workStart!;
      // @ts-ignore
      delete copy.tag.entities[tagId]!.workEnd!;
      // @ts-ignore
      delete copy.tag.entities[tagId]!.breakTime!;
      // @ts-ignore
      delete copy.tag.entities[tagId]!.breakNr!;

      return acc;
    },
    {} as TTWorkContextSessionMap,
  );
  console.log('________________________________________________________', {
    copy,
    projectTimeTracking,
    tagTimeTracking,
  });

  return {
    ...copy,
    // TODO remove
    taskArchive,
    timeTracking: {
      project: projectTimeTracking,
      tag: tagTimeTracking,
      lastFlush: 0,
    },
    archiveYoung: {
      task: taskArchive,
      timeTracking: {
        project: {},
        tag: {},
        lastFlush: 0,
      },
      lastFlush: 0,
    },
    archiveOld: {
      task: { ids: [], entities: {} },
      timeTracking: {
        project: {},
        tag: {},
        lastFlush: 0,
      },
      lastFlush: 0,
    },
  };
}) as CrossModelMigrateFn;
