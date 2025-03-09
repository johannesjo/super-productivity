import { AppBaseDataEntityLikeStates, AppDataComplete } from '../../imex/sync/sync.model';
import { Tag, TagCopy } from '../../features/tag/tag.model';
import { ProjectCopy } from '../../features/project/project.model';
import { isDataRepairPossible } from './is-data-repair-possible.util';
import { Task, TaskArchive, TaskCopy, TaskState } from '../../features/tasks/task.model';
import { unique } from '../../util/unique';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { TaskRepeatCfgCopy } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { ALL_ENTITY_MODEL_KEYS } from '../persistence/persistence.const';
import { IssueProvider } from '../../features/issue/issue.model';

const ENTITY_STATE_KEYS: (keyof AppDataComplete)[] = ALL_ENTITY_MODEL_KEYS;

export const dataRepair = (data: AppDataComplete): AppDataComplete => {
  if (!isDataRepairPossible(data)) {
    throw new Error('Data repair attempted but not possible');
  }

  // console.time('dataRepair');
  // NOTE copy is important to prevent readonly errors
  let dataOut: AppDataComplete = { ...data };
  // let dataOut: AppDataComplete = dirtyDeepCopy(data);
  dataOut = _fixEntityStates(dataOut);
  dataOut = _removeMissingTasksFromListsOrRestoreFromArchive(dataOut);
  dataOut = _removeNonExistentProjectIdsFromIssueProviders(dataOut);
  dataOut = _removeNonExistentProjectIdsFromTasks(dataOut);
  dataOut = _removeNonExistentProjectIdsFromTaskRepeatCfg(dataOut);
  dataOut = _addOrphanedTasksToProjectLists(dataOut);
  dataOut = _moveArchivedSubTasksToUnarchivedParents(dataOut);
  dataOut = _moveUnArchivedSubTasksToArchivedParents(dataOut);
  dataOut = _cleanupOrphanedSubTasks(dataOut);
  dataOut = _cleanupNonExistingTasksFromLists(dataOut);
  dataOut = _cleanupNonExistingNotesFromLists(dataOut);
  dataOut = _fixInconsistentProjectId(dataOut);
  dataOut = _fixInconsistentTagId(dataOut);
  dataOut = _setTaskProjectIdAccordingToParent(dataOut);
  dataOut = _addTodayTagIfNoProjectIdOrTagId(dataOut);
  dataOut = _removeDuplicatesFromArchive(dataOut);
  dataOut = _removeMissingReminderIds(dataOut);

  // console.timeEnd('dataRepair');
  return dataOut;
};

const _fixEntityStates = (data: AppDataComplete): AppDataComplete => {
  ENTITY_STATE_KEYS.forEach((key) => {
    data[key] = _resetEntityIdsFromObjects(
      data[key] as AppBaseDataEntityLikeStates,
    ) as any;
  });

  return data;
};

const _removeDuplicatesFromArchive = (data: AppDataComplete): AppDataComplete => {
  const taskIds = data.task.ids as string[];
  const archiveTaskIds = data.taskArchive.ids as string[];
  const duplicateIds = taskIds.filter((id) => archiveTaskIds.includes(id));

  if (duplicateIds.length) {
    data.taskArchive.ids = archiveTaskIds.filter((id) => !duplicateIds.includes(id));
    duplicateIds.forEach((id) => {
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

const _removeMissingReminderIds = (data: AppDataComplete): AppDataComplete => {
  data.task.ids.forEach((id: string) => {
    const t: Task = data.task.entities[id] as Task;
    if (t.reminderId && !data.reminders.find((r) => r.id === t.reminderId)) {
      data.task.entities[id] = {
        ...t,
        reminderId: undefined,
        plannedAt: undefined,
      };
    }
  });
  return data;
};

const _moveArchivedSubTasksToUnarchivedParents = (
  data: AppDataComplete,
): AppDataComplete => {
  // to avoid ambiguity
  const taskState: TaskState = data.task;
  const taskArchiveState: TaskArchive = data.taskArchive;
  const orhphanedArchivedSubTasks: TaskCopy[] = taskArchiveState.ids
    .map((id: string) => taskArchiveState.entities[id] as TaskCopy)
    .filter((t: TaskCopy) => t.parentId && !taskArchiveState.ids.includes(t.parentId));

  console.log('orhphanedArchivedSubTasks', orhphanedArchivedSubTasks);
  orhphanedArchivedSubTasks.forEach((t: TaskCopy) => {
    // delete archived if duplicate
    if (taskState.ids.includes(t.id as string)) {
      taskArchiveState.ids = taskArchiveState.ids.filter((id) => t.id !== id);
      delete taskArchiveState.entities[t.id];
      // if entity is empty for some reason
      if (!taskState.entities[t.id]) {
        taskState.entities[t.id] = t;
      }
    }
    // copy to today if parent exists
    else if (taskState.ids.includes(t.parentId as string)) {
      taskState.ids.push(t.id);
      taskState.entities[t.id] = t;
      const par: TaskCopy = taskState.entities[t.parentId as string] as TaskCopy;

      par.subTaskIds = unique([...par.subTaskIds, t.id]);

      // and delete from archive
      taskArchiveState.ids = taskArchiveState.ids.filter((id) => t.id !== id);

      delete taskArchiveState.entities[t.id];
    }
    // make main if it doesn't
    else {
      // @ts-ignore
      t.parentId = null;
    }
  });

  return data;
};

const _moveUnArchivedSubTasksToArchivedParents = (
  data: AppDataComplete,
): AppDataComplete => {
  // to avoid ambiguity
  const taskState: TaskState = data.task;
  const taskArchiveState: TaskArchive = data.taskArchive;
  const orhphanedUnArchivedSubTasks: TaskCopy[] = taskState.ids
    .map((id: string) => taskState.entities[id] as TaskCopy)
    .filter((t: TaskCopy) => t.parentId && !taskState.ids.includes(t.parentId));

  console.log('orhphanedUnArchivedSubTasks', orhphanedUnArchivedSubTasks);
  orhphanedUnArchivedSubTasks.forEach((t: TaskCopy) => {
    // delete un-archived if duplicate
    if (taskArchiveState.ids.includes(t.id as string)) {
      taskState.ids = taskState.ids.filter((id) => t.id !== id);
      delete taskState.entities[t.id];
      // if entity is empty for some reason
      if (!taskArchiveState.entities[t.id]) {
        taskArchiveState.entities[t.id] = t;
      }
    }
    // copy to archive if parent exists
    else if (taskArchiveState.ids.includes(t.parentId as string)) {
      taskArchiveState.ids.push(t.id);
      taskArchiveState.entities[t.id] = t;

      const par: TaskCopy = taskArchiveState.entities[t.parentId as string] as TaskCopy;
      par.subTaskIds = unique([...par.subTaskIds, t.id]);

      // and delete from today
      taskState.ids = taskState.ids.filter((id) => t.id !== id);
      delete taskState.entities[t.id];
    }
    // make main if it doesn't
    else {
      // @ts-ignore
      t.parentId = null;
    }
  });

  return data;
};

const _removeMissingTasksFromListsOrRestoreFromArchive = (
  data: AppDataComplete,
): AppDataComplete => {
  const { task, project, tag, taskArchive } = data;
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

    projectItem.backlogTaskIds = projectItem.backlogTaskIds.filter(
      (id: string): boolean => {
        if (taskArchiveIds.includes(id)) {
          taskIdsToRestoreFromArchive.push(id);
          return true;
        }
        return taskIds.includes(id);
      },
    );
  });

  tag.ids.forEach((tId: string | number) => {
    const tagItem = tag.entities[tId] as TagCopy;
    tagItem.taskIds = tagItem.taskIds.filter((id) => taskIds.includes(id));
  });

  taskIdsToRestoreFromArchive.forEach((id) => {
    task.entities[id] = taskArchive.entities[id];
    delete taskArchive.entities[id];
  });
  task.ids = [...taskIds, ...taskIdsToRestoreFromArchive];
  taskArchive.ids = taskArchiveIds.filter(
    (id) => !taskIdsToRestoreFromArchive.includes(id),
  );

  if (taskIdsToRestoreFromArchive.length > 0) {
    console.log(
      taskIdsToRestoreFromArchive.length + ' missing tasks restored from archive.',
    );
  }
  return data;
};

const _resetEntityIdsFromObjects = (
  data: AppBaseDataEntityLikeStates,
): AppBaseDataEntityLikeStates => {
  return {
    ...data,
    entities: (data.entities as any) || {},
    ids: data.entities
      ? Object.keys(data.entities).filter((id) => !!data.entities[id])
      : [],
  };
};

const _addOrphanedTasksToProjectLists = (data: AppDataComplete): AppDataComplete => {
  const { task, project } = data;
  let allTaskIdsOnProjectLists: string[] = [];

  project.ids.forEach((pId: string | number) => {
    const projectItem = project.entities[pId] as ProjectCopy;
    allTaskIdsOnProjectLists = allTaskIdsOnProjectLists.concat(
      projectItem.taskIds,
      projectItem.backlogTaskIds,
    );
  });
  const orphanedTaskIds: string[] = task.ids.filter((tid) => {
    const taskItem = task.entities[tid];
    if (!taskItem) {
      throw new Error('Missing task');
    }
    return (
      !taskItem.parentId && !allTaskIdsOnProjectLists.includes(tid) && taskItem.projectId
    );
  });

  orphanedTaskIds.forEach((tid) => {
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

const _removeNonExistentProjectIdsFromTasks = (
  data: AppDataComplete,
): AppDataComplete => {
  const { task, project, taskArchive } = data;
  const projectIds: string[] = project.ids as string[];
  const taskIds: string[] = task.ids;
  const taskArchiveIds: string[] = taskArchive.ids as string[];
  taskIds.forEach((id) => {
    const t = task.entities[id] as TaskCopy;
    if (t.projectId && !projectIds.includes(t.projectId)) {
      console.log('Delete missing project id from task ' + t.projectId);
      delete t.projectId;
    }
  });

  taskArchiveIds.forEach((id) => {
    const t = taskArchive.entities[id] as TaskCopy;
    if (t.projectId && !projectIds.includes(t.projectId)) {
      console.log('Delete missing project id from archive task ' + t.projectId);
      delete t.projectId;
    }
  });

  return data;
};

const _removeNonExistentProjectIdsFromIssueProviders = (
  data: AppDataComplete,
): AppDataComplete => {
  const { issueProvider, project } = data;
  const projectIds: string[] = project.ids as string[];
  const issueProviderIds: string[] = issueProvider.ids;
  issueProviderIds.forEach((id) => {
    const t = issueProvider.entities[id] as IssueProvider;
    if (t.defaultProjectId && !projectIds.includes(t.defaultProjectId)) {
      console.log('Delete missing project id from issueProvider ' + t.defaultProjectId);
      t.defaultProjectId = null;
    }
  });

  return data;
};

const _removeNonExistentProjectIdsFromTaskRepeatCfg = (
  data: AppDataComplete,
): AppDataComplete => {
  const { project, taskRepeatCfg } = data;
  const projectIds: string[] = project.ids as string[];
  const taskRepeatCfgIds: string[] = taskRepeatCfg.ids as string[];
  taskRepeatCfgIds.forEach((id) => {
    const repeatCfg = taskRepeatCfg.entities[id] as TaskRepeatCfgCopy;
    if (repeatCfg.projectId && !projectIds.includes(repeatCfg.projectId)) {
      if (repeatCfg.tagIds.length) {
        console.log(
          'Delete missing project id from task repeat cfg ' + repeatCfg.projectId,
        );
        repeatCfg.projectId = null;
      } else {
        taskRepeatCfg.ids = (taskRepeatCfg.ids as string[]).filter(
          (rid: string) => rid !== repeatCfg.id,
        );
        delete taskRepeatCfg.entities[repeatCfg.id];
        console.log(
          'Delete task repeat cfg with missing project id' + repeatCfg.projectId,
        );
      }
    }
  });
  return data;
};

const _cleanupNonExistingTasksFromLists = (data: AppDataComplete): AppDataComplete => {
  const projectIds: string[] = data.project.ids as string[];
  projectIds.forEach((pid) => {
    const projectItem = data.project.entities[pid];
    if (!projectItem) {
      console.log(data.project);
      throw new Error('No project');
    }
    (projectItem as ProjectCopy).taskIds = projectItem.taskIds.filter(
      (tid) => !!data.task.entities[tid],
    );
    (projectItem as ProjectCopy).backlogTaskIds = projectItem.backlogTaskIds.filter(
      (tid) => !!data.task.entities[tid],
    );
  });
  const tagIds: string[] = data.tag.ids as string[];
  tagIds
    .map((id) => data.tag.entities[id])
    .forEach((tagItem) => {
      if (!tagItem) {
        console.log(data.tag);
        throw new Error('No tag');
      }
      (tagItem as TagCopy).taskIds = tagItem.taskIds.filter(
        (tid) => !!data.task.entities[tid],
      );
    });
  return data;
};

const _cleanupNonExistingNotesFromLists = (data: AppDataComplete): AppDataComplete => {
  const projectIds: string[] = data.project.ids as string[];
  projectIds.forEach((pid) => {
    const projectItem = data.project.entities[pid];
    if (!projectItem) {
      console.log(data.project);
      throw new Error('No project');
    }
    (projectItem as ProjectCopy).noteIds = (projectItem as ProjectCopy).noteIds
      ? projectItem.noteIds.filter((tid) => !!data.note.entities[tid])
      : [];
  });

  // also cleanup today's notes
  data.note.todayOrder = data.note.todayOrder
    ? data.note.todayOrder.filter((tid) => !!data.note.entities[tid])
    : [];

  return data;
};

const _fixInconsistentProjectId = (data: AppDataComplete): AppDataComplete => {
  const projectIds: string[] = data.project.ids as string[];
  projectIds
    .map((id) => data.project.entities[id])
    .forEach((projectItem) => {
      if (!projectItem) {
        console.log(data.project);
        throw new Error('No project');
      }
      projectItem.taskIds.forEach((tid) => {
        const task = data.task.entities[tid];
        if (!task) {
          throw new Error('No task found');
        } else if (task?.projectId !== projectItem.id) {
          // if the task has another projectId leave it there and remove from list
          if (task.projectId) {
            (projectItem as ProjectCopy).taskIds = projectItem.taskIds.filter(
              (cid) => cid !== task.id,
            );
          } else {
            // if the task has no project id at all, then move it to the project
            (task as TaskCopy).projectId = projectItem.id;
          }
        }
      });
      projectItem.backlogTaskIds.forEach((tid) => {
        const task = data.task.entities[tid];
        if (!task) {
          throw new Error('No task found');
        } else if (task?.projectId !== projectItem.id) {
          // if the task has another projectId leave it there and remove from list
          if (task.projectId) {
            (projectItem as ProjectCopy).backlogTaskIds =
              projectItem.backlogTaskIds.filter((cid) => cid !== task.id);
          } else {
            // if the task has no project id at all, then move it to the project
            (task as TaskCopy).projectId = projectItem.id;
          }
        }
      });
    });

  return data;
};

const _fixInconsistentTagId = (data: AppDataComplete): AppDataComplete => {
  const tagIds: string[] = data.tag.ids as string[];
  tagIds
    .map((id) => data.tag.entities[id])
    .forEach((tagItem) => {
      if (!tagItem) {
        console.log(data.tag);
        throw new Error('No tag');
      }
      tagItem.taskIds.forEach((tid) => {
        const task = data.task.entities[tid];
        if (!task) {
          throw new Error('No task found');
        } else if (!task?.tagIds.includes(tagItem.id)) {
          (task as TaskCopy).tagIds = [...task.tagIds, tagItem.id];
        }
      });
    });

  return data;
};

const _addTodayTagIfNoProjectIdOrTagId = (data: AppDataComplete): AppDataComplete => {
  const taskIds: string[] = data.task.ids as string[];
  taskIds
    .map((id) => data.task.entities[id])
    .forEach((task) => {
      if (task && !task.parentId && !task.tagIds.length && !task.projectId) {
        const tag = data.tag.entities[TODAY_TAG.id] as Tag;
        (task as any).tagIds = [TODAY_TAG.id];
        (tag as any).taskIds = [...tag.taskIds, task.id];
      }
    });

  const archivedTaskIds: string[] = data.taskArchive.ids as string[];
  archivedTaskIds
    .map((id) => data.taskArchive.entities[id])
    .forEach((task) => {
      if (task && !task.parentId && !task.tagIds.length && !task.projectId) {
        (task as any).tagIds = [TODAY_TAG.id];
      }
    });

  return data;
};

const _setTaskProjectIdAccordingToParent = (data: AppDataComplete): AppDataComplete => {
  const taskIds: string[] = data.task.ids as string[];
  taskIds
    .map((id) => data.task.entities[id])
    .forEach((taskItem) => {
      if (!taskItem) {
        console.log(data.task);
        throw new Error('No task');
      }
      if (taskItem.subTaskIds) {
        const parentProjectId = taskItem.projectId;
        taskItem.subTaskIds.forEach((stid) => {
          const subTask = data.task.entities[stid];
          if (!subTask) {
            throw new Error('Task data not found');
          }
          if (subTask.projectId !== parentProjectId) {
            (subTask as TaskCopy).projectId = parentProjectId;
          }
        });
      }
    });

  const archiveTaskIds: string[] = data.taskArchive.ids as string[];
  archiveTaskIds
    .map((id) => data.taskArchive.entities[id])
    .forEach((taskItem) => {
      if (!taskItem) {
        console.log(data.taskArchive);
        throw new Error('No archive task');
      }
      if (taskItem.subTaskIds) {
        const parentProjectId = taskItem.projectId;
        taskItem.subTaskIds.forEach((stid) => {
          const subTask = data.taskArchive.entities[stid];
          if (!subTask) {
            throw new Error('Archived Task data not found');
          }
          if (subTask.projectId !== parentProjectId) {
            (subTask as TaskCopy).projectId = parentProjectId;
          }
        });
      }
    });

  return data;
};

const _cleanupOrphanedSubTasks = (data: AppDataComplete): AppDataComplete => {
  const taskIds: string[] = data.task.ids as string[];
  taskIds
    .map((id) => data.task.entities[id])
    .forEach((taskItem) => {
      if (!taskItem) {
        console.log(data.task);
        throw new Error('No task');
      }

      if (taskItem.subTaskIds.length) {
        let i = taskItem.subTaskIds.length - 1;
        while (i >= 0) {
          const sid = taskItem.subTaskIds[i];
          if (!data.task.entities[sid]) {
            console.log('Delete orphaned sub task for ', taskItem);
            taskItem.subTaskIds.splice(i, 1);
          }
          i -= 1;
        }
      }
    });

  const archiveTaskIds: string[] = data.taskArchive.ids as string[];
  archiveTaskIds
    .map((id) => data.taskArchive.entities[id])
    .forEach((taskItem) => {
      if (!taskItem) {
        console.log(data.taskArchive);
        throw new Error('No archive task');
      }

      if (taskItem.subTaskIds.length) {
        let i = taskItem.subTaskIds.length - 1;
        while (i >= 0) {
          const sid = taskItem.subTaskIds[i];
          if (!data.taskArchive.entities[sid]) {
            console.log('Delete orphaned archive sub task for ', taskItem);
            taskItem.subTaskIds.splice(i, 1);
          }
          i -= 1;
        }
      }
    });

  return data;
};
