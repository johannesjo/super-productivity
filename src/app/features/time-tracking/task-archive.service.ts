import { inject, Injectable } from '@angular/core';
import {
  modelExecAction,
  modelExecActions,
  modelGetById,
} from '../../pfapi/pfapi-helper';
import {
  deleteTasks,
  removeTagsForAllTasks,
  roundTimeSpentForDay,
  updateTask,
} from '../tasks/store/task.actions';
import { taskReducer } from '../tasks/store/task.reducer';
import { PfapiService } from '../../pfapi/pfapi.service';
import { Task, TaskArchive } from '../tasks/task.model';
import { RoundTimeOption } from '../project/project.model';
import { Update } from '@ngrx/entity';

@Injectable({
  providedIn: 'root',
})
export class TaskArchiveService {
  private _pfapiService = inject(PfapiService);

  constructor() {}

  // TODO refactor to loadAll and loadRecent maybe
  async load(isSkipMigration = false): Promise<TaskArchive> {
    return this._pfapiService.m.taskArchive.load(isSkipMigration);
  }

  // TODO error
  async getById(id: string): Promise<Task> {
    const r = await modelGetById(id, this._pfapiService.m.taskArchive);
    if (!r) {
      throw new Error('Archive task not found by id');
    }
    return r as Task;
  }

  async deleteTasks(archiveTaskIdsToDelete: string[]): Promise<void> {
    await modelExecAction(
      this._pfapiService.m.taskArchive,
      deleteTasks({ taskIds: archiveTaskIdsToDelete }),
      taskReducer as any,
      true,
    );

    // TODO old archive also
    // await modelExecAction(
    //   this._taskArchiveService,
    //   deleteTasks({ taskIds: archiveTaskIdsToDelete }),
    //   taskReducer as any,
    //   true,
    // );
  }

  async removeTagsFromAllTasks(tagIdsToRemove: string[]): Promise<void> {
    await modelExecAction(
      this._pfapiService.m.taskArchive,
      removeTagsForAllTasks({ tagIdsToRemove }),
      taskReducer as any,
      true,
    );
    // TODO old archive also
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
      await this.updateArchiveTasks(updates);
    }
  }

  async updateArchiveTask(id: string, changedFields: Partial<Task>): Promise<void> {
    await modelExecAction(
      this._pfapiService.m.taskArchive,
      updateTask({
        task: {
          id,
          changes: changedFields,
        },
      }),
      taskReducer as any,
      true,
    );
  }

  async updateArchiveTasks(updates: Update<Task>[]): Promise<void> {
    await modelExecActions(
      this._pfapiService.m.taskArchive,
      updates.map((upd) => updateTask({ task: upd })),
      taskReducer as any,
      true,
    );
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
    await modelExecAction(
      this._pfapiService.m.taskArchive,
      roundTimeSpentForDay({ day, taskIds, roundTo, isRoundUp, projectId }),
      taskReducer as any,
      true,
    );
  }
}
