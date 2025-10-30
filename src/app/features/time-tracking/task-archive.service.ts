import { inject, Injectable } from '@angular/core';
import { Action } from '@ngrx/store';
import { roundTimeSpentForDay } from '../tasks/store/task.actions';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { TASK_FEATURE_NAME, taskReducer } from '../tasks/store/task.reducer';
import { taskSharedCrudMetaReducer } from '../../root-store/meta/task-shared-meta-reducers/task-shared-crud.reducer';
import { tagSharedMetaReducer } from '../../root-store/meta/task-shared-meta-reducers/tag-shared.reducer';
import { PfapiService } from '../../pfapi/pfapi.service';
import { Task, TaskArchive, TaskState } from '../tasks/task.model';
import { RoundTimeOption } from '../project/project.model';
import { Update } from '@ngrx/entity';
import { ArchiveModel } from './time-tracking.model';
import { ModelCfgToModelCtrl } from '../../pfapi/api';
import { PfapiAllModelCfg } from '../../pfapi/pfapi-config';
import { Log } from '../../core/log';
import { RootState } from '../../root-store/root-state';
import { PROJECT_FEATURE_NAME } from '../project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../tag/store/tag.reducer';
import { WORK_CONTEXT_FEATURE_NAME } from '../work-context/store/work-context.selectors';
import { plannerFeatureKey } from '../planner/store/planner.reducer';

// Create a minimal RootState with the archive task state
// Other feature states are empty as they're not needed for task updates
const FAKE_ROOT_STATE: RootState = {
  [PROJECT_FEATURE_NAME]: { ids: [], entities: {} },
  [TAG_FEATURE_NAME]: { ids: [], entities: {} },
  [WORK_CONTEXT_FEATURE_NAME]: {
    activeId: 'xyz',
    activeType: 'TAG',
  },
  [plannerFeatureKey]: { days: {}, addPlannedTasksDialogLastShown: undefined },
} as const as Partial<RootState> as RootState;

type TaskArchiveAction =
  | ReturnType<typeof TaskSharedActions.updateTask>
  | ReturnType<typeof TaskSharedActions.deleteTasks>
  | ReturnType<typeof TaskSharedActions.removeTagsForAllTasks>
  | ReturnType<typeof roundTimeSpentForDay>;

@Injectable({
  providedIn: 'root',
})
export class TaskArchiveService {
  private _pfapiService = inject(PfapiService);

  constructor() {}

  async loadYoung(): Promise<TaskArchive> {
    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    return {
      ids: archiveYoung.task.ids,
      entities: archiveYoung.task.entities,
    };
  }

  async load(): Promise<TaskArchive> {
    // NOTE: these are already saved in memory to speed up things
    const [archiveYoung, archiveOld] = await Promise.all([
      this._pfapiService.m.archiveYoung.load(),
      this._pfapiService.m.archiveOld.load(),
    ]);

    return {
      ids: [...archiveYoung.task.ids, ...archiveOld.task.ids],
      entities: {
        ...archiveYoung.task.entities,
        ...archiveOld.task.entities,
      },
    };
  }

  async getById(id: string): Promise<Task> {
    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    if (archiveYoung.task.entities[id]) {
      return archiveYoung.task.entities[id];
    }
    const archiveOld = await this._pfapiService.m.archiveOld.load();
    if (archiveOld.task.entities[id]) {
      return archiveOld.task.entities[id];
    }
    throw new Error('Archive task not found by id');
  }

  async deleteTasks(taskIdsToDelete: string[]): Promise<void> {
    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    const toDeleteInArchiveYoung = taskIdsToDelete.filter(
      (id) => !!archiveYoung.task.entities[id],
    );

    if (toDeleteInArchiveYoung.length > 0) {
      const newTaskState = this._reduceForArchive(
        archiveYoung,
        TaskSharedActions.deleteTasks({ taskIds: toDeleteInArchiveYoung }),
      );
      await this._pfapiService.m.archiveYoung.save(
        {
          ...archiveYoung,
          task: newTaskState,
        },
        { isUpdateRevAndLastUpdate: true },
      );
    }

    if (toDeleteInArchiveYoung.length < taskIdsToDelete.length) {
      const archiveOld = await this._pfapiService.m.archiveOld.load();
      const toDeleteInArchiveOld = taskIdsToDelete.filter(
        (id) => !!archiveOld.task.entities[id],
      );
      const newTaskStateArchiveOld = this._reduceForArchive(
        archiveOld,
        TaskSharedActions.deleteTasks({ taskIds: toDeleteInArchiveOld }),
      );
      await this._pfapiService.m.archiveOld.save(
        {
          ...archiveOld,
          task: newTaskStateArchiveOld,
        },
        { isUpdateRevAndLastUpdate: true },
      );
    }
  }

  async updateTask(id: string, changedFields: Partial<Task>): Promise<void> {
    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    if (archiveYoung.task.entities[id]) {
      Log.x(changedFields, id);

      return await this._execAction(
        'archiveYoung',
        archiveYoung,
        TaskSharedActions.updateTask({ task: { id, changes: changedFields } }),
      );
    }
    const archiveOld = await this._pfapiService.m.archiveOld.load();
    if (archiveOld.task.entities[id]) {
      return await this._execAction(
        'archiveOld',
        archiveOld,
        TaskSharedActions.updateTask({ task: { id, changes: changedFields } }),
      );
    }
    throw new Error('Archive task to update not found');
  }

  async updateTasks(updates: Update<Task>[]): Promise<void> {
    const allUpdates = updates.map((upd) => TaskSharedActions.updateTask({ task: upd }));
    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    const updatesYoung = allUpdates.filter(
      (upd) => !!archiveYoung.task.entities[upd.task.id],
    );
    if (updatesYoung.length > 0) {
      let currentArchiveYoung = archiveYoung;
      for (const act of updatesYoung) {
        const newTaskState = this._reduceForArchive(currentArchiveYoung, act);
        currentArchiveYoung = { ...currentArchiveYoung, task: newTaskState };
      }
      const newTaskStateArchiveYoung = currentArchiveYoung.task;
      await this._pfapiService.m.archiveYoung.save(
        {
          ...archiveYoung,
          task: newTaskStateArchiveYoung,
        },
        { isUpdateRevAndLastUpdate: true },
      );
    }

    if (updatesYoung.length < updates.length) {
      const archiveOld = await this._pfapiService.m.archiveOld.load();
      const updatesOld = allUpdates.filter(
        (upd) => !!archiveOld.task.entities[upd.task.id],
      );
      let currentArchiveOld = archiveOld;
      for (const act of updatesOld) {
        const newTaskState = this._reduceForArchive(currentArchiveOld, act);
        currentArchiveOld = { ...currentArchiveOld, task: newTaskState };
      }
      const newTaskStateArchiveOld = currentArchiveOld.task;
      await this._pfapiService.m.archiveOld.save(
        {
          ...archiveOld,
          task: newTaskStateArchiveOld,
        },
        { isUpdateRevAndLastUpdate: true },
      );
    }
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
    const taskArchiveState: TaskArchive = await this.load();
    await this._execActionBoth(
      TaskSharedActions.removeTagsForAllTasks({ tagIdsToRemove }),
    );

    const isOrphanedParentTask = (t: Task): boolean =>
      !t.projectId && !t.tagIds.length && !t.parentId;

    // remove orphaned for archive

    let archiveSubTaskIdsToDelete: string[] = [];
    const archiveMainTaskIdsToDelete: string[] = [];
    (taskArchiveState.ids as string[]).forEach((id) => {
      const t = taskArchiveState.entities[id] as Task;
      if (isOrphanedParentTask(t)) {
        archiveMainTaskIdsToDelete.push(id);
        archiveSubTaskIdsToDelete = archiveSubTaskIdsToDelete.concat(t.subTaskIds);
      }
    });
    // TODO check to maybe update to today tag instead
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
            // TODO check if undefined causes problems
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
    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    const taskIdsInArchiveYoung = taskIds.filter(
      (id) => !!archiveYoung.task.entities[id],
    );
    if (taskIdsInArchiveYoung.length > 0) {
      const newTaskState = this._reduceForArchive(
        archiveYoung,
        roundTimeSpentForDay({
          day,
          taskIds: taskIdsInArchiveYoung,
          roundTo,
          isRoundUp,
          projectId,
        }),
      );
      await this._pfapiService.m.archiveYoung.save(
        {
          ...archiveYoung,
          task: newTaskState,
        },
        { isUpdateRevAndLastUpdate: true },
      );
    }
    if (taskIdsInArchiveYoung.length < taskIds.length) {
      const archiveOld = await this._pfapiService.m.archiveOld.load();
      const taskIdsInArchiveOld = taskIds.filter((id) => !!archiveOld.task.entities[id]);
      if (taskIdsInArchiveOld.length > 0) {
        const newTaskStateArchiveOld = this._reduceForArchive(
          archiveOld,
          roundTimeSpentForDay({
            day,
            taskIds: taskIdsInArchiveOld,
            roundTo,
            isRoundUp,
            projectId,
          }),
        );
        await this._pfapiService.m.archiveOld.save(
          {
            ...archiveOld,
            task: newTaskStateArchiveOld,
          },
          { isUpdateRevAndLastUpdate: true },
        );
      }
    }
  }

  // -----------------------------------------

  private async _execAction(
    target: Extract<
      keyof ModelCfgToModelCtrl<PfapiAllModelCfg>,
      'archiveYoung' | 'archiveOld'
    >,
    archiveBefore: ArchiveModel,
    action: TaskArchiveAction,
  ): Promise<void> {
    const newTaskState = this._reduceForArchive(archiveBefore, action);
    Log.x(newTaskState);
    await this._pfapiService.m[target].save(
      {
        ...archiveBefore,
        task: newTaskState,
      },
      { isUpdateRevAndLastUpdate: true },
    );
  }

  private async _execActionBoth(
    action: TaskArchiveAction,
    isUpdateRevAndLastUpdate = true,
  ): Promise<void> {
    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    const newTaskState = this._reduceForArchive(archiveYoung, action);

    const archiveOld = await this._pfapiService.m.archiveOld.load();
    const newTaskStateArchiveOld = this._reduceForArchive(archiveOld, action);

    await this._pfapiService.m.archiveYoung.save(
      {
        ...archiveYoung,
        task: newTaskState,
      },
      { isUpdateRevAndLastUpdate },
    );
    await this._pfapiService.m.archiveOld.save(
      {
        ...archiveOld,
        task: newTaskStateArchiveOld,
      },
      { isUpdateRevAndLastUpdate },
    );
  }

  private _reduceForArchive(
    archiveBefore: ArchiveModel,
    action: TaskArchiveAction,
  ): TaskState {
    // Create a wrapped reducer that combines taskReducer with the meta-reducer
    const baseReducer = (state: RootState, act: Action): RootState => ({
      ...state,
      [TASK_FEATURE_NAME]: taskReducer(state[TASK_FEATURE_NAME], act),
    });

    const reducerWithCrud = taskSharedCrudMetaReducer(baseReducer);
    const reducerWithTags = tagSharedMetaReducer(reducerWithCrud);

    // Create root state with the actual archive task state
    const rootStateWithArchiveTasks: RootState = {
      ...FAKE_ROOT_STATE,
      [TASK_FEATURE_NAME]: archiveBefore.task as TaskState,
    };

    // Apply the action through the wrapped reducer
    const updatedRootState = reducerWithTags(rootStateWithArchiveTasks, action);

    // Extract and return the updated task state
    return updatedRootState[TASK_FEATURE_NAME];
  }

  // more beautiful but less efficient
  // private async _partitionTasksByArchive<T>(
  //   ids: string[],
  //   mapper: (id: string, archive: ArchiveModel) => T,
  // ): Promise<{ young: T[]; old: T[] }> {
  //   const [archiveYoung, archiveOld] = await Promise.all([
  //     this._pfapiService.m.archive.load(),
  //     this._pfapiService.m.archiveOld.load(),
  //   ]);
  //
  //   const young: T[] = [];
  //   const old: T[] = [];
  //
  //   ids.forEach((id) => {
  //     if (archiveYoung.task.entities[id]) {
  //       young.push(mapper(id, archiveYoung));
  //     } else if (archiveOld.task.entities[id]) {
  //       old.push(mapper(id, archiveOld));
  //     }
  //   });
  //
  //   return { young, old };
  // }
}
