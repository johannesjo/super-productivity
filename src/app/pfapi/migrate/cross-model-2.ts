import { AppDataCompleteLegacy } from '../../imex/sync/sync.model';
import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn, ImpossibleError } from '../api';
import { TTWorkContextSessionMap } from '../../features/time-tracking/time-tracking.model';
import { ProjectCopy } from '../../features/project/project.model';
import { TagCopy } from '../../features/tag/tag.model';
import {
  HideSubTasksMode,
  TaskArchive,
  TaskCopy,
  TaskState,
  TimeSpentOnDayCopy,
} from '../../features/tasks/task.model';
import { Dictionary } from '@ngrx/entity';
import {
  BoardsState,
  initialBoardsState,
} from '../../features/boards/store/boards.reducer';
import { DEFAULT_BOARD_CFG, DEFAULT_PANEL_CFG } from '../../features/boards/boards.const';
import { PFLog } from '../../core/log';

export const crossModelMigration2: CrossModelMigrateFn = ((
  fullData: AppDataCompleteLegacy,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate2__________________');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lastLocalSyncModelChange, lastArchiveUpdate, taskArchive, ...copy } = fullData;

  if (
    (fullData as any as AppDataCompleteNew).archiveYoung &&
    (fullData as any as AppDataCompleteNew).archiveOld &&
    (fullData as any as AppDataCompleteNew).timeTracking &&
    (fullData as any as AppDataCompleteNew).timeTracking.project &&
    Object.keys((fullData as any as AppDataCompleteNew).timeTracking.project).length
  ) {
    // If time tracking is already migrated, return the original data
    PFLog.err('already migrated despite old model version!!!');
    return fullData as any as AppDataCompleteNew;
  }
  PFLog.log(':::::::::::crossModelMigration2::::::::::::::');

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
  PFLog.log('________________________________________________________', {
    copy,
    projectTimeTracking,
    tagTimeTracking,
  });

  // TODO check if there is a better way to avoid problems with returning only the old model
  // @ts-ignore
  return {
    ...copy,
    timeTracking: {
      project: projectTimeTracking,
      tag: tagTimeTracking,
    },
    archiveYoung: {
      task: migrateTaskArchive(taskArchive),
      timeTracking: {
        project: {},
        tag: {},
      },
      lastTimeTrackingFlush: 0,
    },
    archiveOld: {
      task: { ids: [], entities: {} },
      timeTracking: {
        project: {},
        tag: {},
      },
      lastTimeTrackingFlush: 0,
    },
    task: migrateTaskState(copy.task),
    boards: migrateBoards(copy.boards),
  };
}) as CrossModelMigrateFn;

// TODO remove later
const migrateBoards = (boardsState: BoardsState): BoardsState => {
  if (!boardsState) {
    return initialBoardsState;
  }

  return {
    ...boardsState,
    boardCfgs: boardsState.boardCfgs.map((boardCfg) => {
      return {
        ...DEFAULT_BOARD_CFG,
        ...boardCfg,
        panels: boardCfg.panels.map((panel) => ({
          ...DEFAULT_PANEL_CFG,
          ...panel,
        })),
      };
    }),
  };
};

const migrateTaskArchive = (taskArchive: TaskArchive): TaskArchive => {
  migrateTaskDictionary(taskArchive.entities);
  return taskArchive;
};

const migrateTaskState = (taskState: TaskState): TaskState => {
  migrateTaskDictionary(taskState.entities);
  return taskState;
};

const migrateTaskDictionary = (taskDict: Dictionary<TaskCopy>): void => {
  Object.keys(taskDict).forEach((taskId) => {
    if (!taskDict[taskId]) {
      throw new ImpossibleError('Task not defined');
    }
    const task = taskDict[taskId];
    // fix weird legacy issues
    if (task.timeEstimate === null || task.timeEstimate === undefined) {
      taskDict[taskId] = {
        ...taskDict[taskId],
        timeEstimate: 0,
      };
    }
    if (typeof (task.issueId as unknown) === 'number') {
      taskDict[taskId] = {
        ...taskDict[taskId],
        issueId: (task.issueId as unknown as number).toString(),
      };
    }
    if (task.created === null || task.created === undefined) {
      taskDict[taskId] = {
        ...taskDict[taskId],
        created: 0,
      };
    }
    if (task.repeatCfgId === null) {
      taskDict[taskId] = {
        ...taskDict[taskId],
        repeatCfgId: undefined,
      };
    }

    if (task.notes === '') {
      delete taskDict[taskId].notes;
    }

    if (!task._hideSubTasksMode) {
      const oldValue = (task as any)._showSubTasksMode as number;
      let newValue: HideSubTasksMode | undefined;
      if (oldValue === 1) {
        newValue = 1;
      } else if (oldValue === 0) {
        newValue = 2;
      }
      if ('_showSubTasksMode' in (taskDict[taskId] as any)) {
        delete (taskDict[taskId] as any)._showSubTasksMode;
      }

      if (newValue) {
        taskDict[taskId] = {
          ...taskDict[taskId],
          _hideSubTasksMode: newValue as HideSubTasksMode,
        };
      }
    }

    // Remove null and undefined values from task.timeSpentOnDay
    if (task.timeSpentOnDay) {
      const cleanTimeSpent: TimeSpentOnDayCopy = {};
      let hasInvalidValues = false;

      Object.entries(task.timeSpentOnDay).forEach(([date, timeSpent]) => {
        if (timeSpent !== null && timeSpent !== undefined) {
          cleanTimeSpent[date] = timeSpent;
        } else {
          hasInvalidValues = true;
        }
      });
      if (hasInvalidValues) {
        taskDict[taskId] = {
          ...taskDict[taskId],
          timeSpentOnDay: cleanTimeSpent,
        };
      }
    }
  });
};
