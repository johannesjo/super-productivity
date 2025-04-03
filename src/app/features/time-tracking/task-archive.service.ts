import { inject, Injectable } from '@angular/core';
import {
  deleteTasks,
  removeTagsForAllTasks,
  roundTimeSpentForDay,
  updateTask,
} from '../tasks/store/task.actions';
import { taskReducer } from '../tasks/store/task.reducer';
import { PfapiService } from '../../pfapi/pfapi.service';
import { Task, TaskArchive, TaskState } from '../tasks/task.model';
import { RoundTimeOption } from '../project/project.model';
import { Update } from '@ngrx/entity';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { Action } from '@ngrx/store';

@Injectable({
  providedIn: 'root',
})
export class TaskArchiveService {
  private _pfapiService = inject(PfapiService);

  constructor() {}

  async load(isSkipMigration = false): Promise<TaskArchive> {
    // NOTE: these are already saved in memory to speed up things
    const archive = await this._pfapiService.m.archive.load(isSkipMigration);
    const archiveOld = await this._pfapiService.m.archiveOld.load(isSkipMigration);
    return {
      ids: [...archive.task.ids, ...archiveOld.task.ids],
      entities: {
        ...archive.task.entities,
        ...archiveOld.task.entities,
      },
    };
  }

  async getById(id: string): Promise<Task> {
    const archive = await this._pfapiService.m.archive.load();
    if (archive.task.entities[id]) {
      return archive.task.entities[id];
    }
    const archiveOld = await this._pfapiService.m.archiveOld.load();
    if (archiveOld.task.entities[id]) {
      return archiveOld.task.entities[id];
    }
    throw new Error('Archive task not found by id');
  }

  async deleteTasks(archiveTaskIdsToDelete: string[]): Promise<void> {
    await this._execAction(deleteTasks({ taskIds: archiveTaskIdsToDelete }));
  }

  async updateTask(id: string, changedFields: Partial<Task>): Promise<void> {
    await this._execAction(
      updateTask({
        task: {
          id,
          changes: changedFields,
        },
      }),
    );
  }

  async updateTasks(updates: Update<Task>[]): Promise<void> {
    await this._execActions(updates.map((upd) => updateTask({ task: upd })));
  }

  // -----------------------------------------
  async removeAllArchiveTasksForProject(projectIdToDelete: string): Promise<void> {
    const taskArchiveState: TaskArchive = await this.load();
    const archiveTaskIdsToDelete = !!taskArchiveState
      ? (taskArchiveState.ids as string[]).filter((id) => {
          const t = taskArchiveState.entities[id] as Task;
          if (!t) {
            throw new Error('No task');
          }
          return t.projectId === projectIdToDelete;
        })
      : [];
    await this.deleteTasks(archiveTaskIdsToDelete);
  }

  async removeTagsFromAllTasks(tagIdsToRemove: string[]): Promise<void> {
    await this._execAction(removeTagsForAllTasks({ tagIdsToRemove }));

    const isOrphanedParentTask = (t: Task): boolean =>
      !t.projectId && !t.tagIds.length && !t.parentId;

    // remove orphaned for archive
    const taskArchiveState: TaskArchive = (await this.load()) || createEmptyEntity();

    let archiveSubTaskIdsToDelete: string[] = [];
    const archiveMainTaskIdsToDelete: string[] = [];
    (taskArchiveState.ids as string[]).forEach((id) => {
      const t = taskArchiveState.entities[id] as Task;
      if (isOrphanedParentTask(t)) {
        archiveMainTaskIdsToDelete.push(id);
        archiveSubTaskIdsToDelete = archiveSubTaskIdsToDelete.concat(t.subTaskIds);
      }
    });
    // TODO update to today tag instead maybe
    await this.deleteTasks([...archiveMainTaskIdsToDelete, ...archiveSubTaskIdsToDelete]);
  }

  async removeRepeatCfgFromArchiveTasks(repeatConfigId: string): Promise<void> {
    const taskArchive = await this.load();

    const newState = { ...taskArchive };
    const ids = newState.ids as string[];

    const tasksWithRepeatCfgId = ids
      .map((id) => newState.entities[id] as Task)
      .filter((task) => task.repeatCfgId === repeatConfigId);

    if (tasksWithRepeatCfgId && tasksWithRepeatCfgId.length) {
      const updates: Update<Task>[] = tasksWithRepeatCfgId.map((t) => {
        return {
          id: t.id,
          changes: {
            repeatCfgId: undefined,
          },
        };
      });
      await this.updateTasks(updates);
    }
  }

  async roundTimeSpent({
    day,
    taskIds,
    roundTo,
    isRoundUp = false,
    projectId,
  }: {
    day: string;
    taskIds: string[];
    roundTo: RoundTimeOption;
    isRoundUp: boolean;
    projectId?: string | null;
  }): Promise<void> {
    await this._execAction(
      roundTimeSpentForDay({ day, taskIds, roundTo, isRoundUp, projectId }),
    );
  }

  // -----------------------------------------
  private async _execAction(
    action: Action,
    isUpdateRevAndLastUpdate = true,
  ): Promise<void> {
    const archive = await this._pfapiService.m.archive.load();
    const newTaskState = taskReducer(archive.task as TaskState, action);

    const archiveOld = await this._pfapiService.m.archiveOld.load();
    const newTaskStateArchiveOld = taskReducer(archiveOld.task as TaskState, action);

    await this._pfapiService.m.archive.save(
      {
        ...archive,
        task: newTaskState,
      },
      { isUpdateRevAndLastUpdate },
    );
    await this._pfapiService.m.archiveOld.save(
      {
        ...archive,
        task: newTaskStateArchiveOld,
      },
      { isUpdateRevAndLastUpdate },
    );
  }

  private async _execActions(
    actions: Action[],
    isUpdateRevAndLastUpdate = true,
  ): Promise<void> {
    const archive = await this._pfapiService.m.archive.load();
    const newTaskState = actions.reduce(
      (acc, act) => taskReducer(acc, act),
      archive.task as TaskState,
    );

    const archiveOld = await this._pfapiService.m.archiveOld.load();
    const newTaskStateArchiveOld = actions.reduce(
      (acc, act) => taskReducer(acc, act),
      archiveOld.task as TaskState,
    );

    await this._pfapiService.m.archive.save(
      {
        ...archive,
        task: newTaskState,
      },
      { isUpdateRevAndLastUpdate },
    );
    await this._pfapiService.m.archiveOld.save(
      {
        ...archive,
        task: newTaskStateArchiveOld,
      },
      { isUpdateRevAndLastUpdate },
    );
  }
}
