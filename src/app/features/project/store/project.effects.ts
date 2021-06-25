import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, select, Store } from '@ngrx/store';
import { concatMap, filter, first, map, switchMap, take, tap } from 'rxjs/operators';
import {
  AddProject,
  ArchiveProject,
  DeleteProject,
  LoadProjectRelatedDataSuccess,
  ProjectActionTypes,
  UnarchiveProject,
  UpdateProject,
  UpdateProjectIssueProviderCfg,
  UpdateProjectWorkEnd,
  UpdateProjectWorkStart,
} from './project.actions';
import { selectProjectFeatureState } from './project.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { BookmarkService } from '../../bookmark/bookmark.service';
import { NoteService } from '../../note/note.service';
import { SnackService } from '../../../core/snack/snack.service';
import { getWorklogStr } from '../../../util/get-work-log-str';
import {
  AddTask,
  AddTimeSpent,
  ConvertToMainTask,
  DeleteMainTasks,
  DeleteTask,
  MoveToArchive,
  MoveToOtherProject,
  RestoreTask,
  TaskActionTypes,
  UpdateTaskTags,
} from '../../tasks/store/task.actions';
import { ReminderService } from '../../reminder/reminder.service';
import { ProjectService } from '../project.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { T } from '../../../t.const';
import {
  moveTaskDownInBacklogList,
  moveTaskDownInTodayList,
  moveTaskInBacklogList,
  moveTaskInTodayList,
  moveTaskToBacklogList,
  moveTaskToBacklogListAuto,
  moveTaskToTodayList,
  moveTaskToTodayListAuto,
  moveTaskUpInBacklogList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import { WorkContextType } from '../../work-context/work-context.model';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { Project } from '../project.model';
import { TaskService } from '../../tasks/task.service';
import { Task, TaskArchive, TaskState } from '../../tasks/task.model';
import { unique } from '../../../util/unique';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { TODAY_TAG } from '../../tag/tag.const';
import { EMPTY, Observable, of } from 'rxjs';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

@Injectable()
export class ProjectEffects {
  @Effect({ dispatch: false })
  syncProjectToLs$: Observable<unknown> = this._actions$.pipe(
    ofType(
      ProjectActionTypes.AddProject,
      ProjectActionTypes.DeleteProject,
      ProjectActionTypes.UpdateProject,
      ProjectActionTypes.UpdateProjectAdvancedCfg,
      ProjectActionTypes.UpdateProjectIssueProviderCfg,
      ProjectActionTypes.UpdateProjectWorkStart,
      ProjectActionTypes.UpdateProjectWorkEnd,
      ProjectActionTypes.AddToProjectBreakTime,
      ProjectActionTypes.UpdateProjectOrder,
      ProjectActionTypes.ArchiveProject,
      ProjectActionTypes.UnarchiveProject,

      moveTaskInBacklogList.type,
      moveTaskToBacklogList.type,
      moveTaskToTodayList.type,
      moveTaskUpInBacklogList.type,
      moveTaskDownInBacklogList.type,
      moveTaskToBacklogListAuto.type,
      moveTaskToTodayListAuto.type,
    ),
    switchMap((a) => {
      // exclude ui only actions
      if (
        [
          ProjectActionTypes.UpdateProjectWorkStart,
          ProjectActionTypes.UpdateProjectWorkEnd,
        ].includes(a.type as any)
      ) {
        return this.saveToLs$(false);
      } else {
        return this.saveToLs$(true);
      }
    }),
  );
  @Effect({ dispatch: false })
  updateProjectStorageConditionalTask$: Observable<unknown> = this._actions$.pipe(
    ofType(
      TaskActionTypes.AddTask,
      TaskActionTypes.DeleteTask,
      TaskActionTypes.MoveToOtherProject,
      TaskActionTypes.RestoreTask,
      TaskActionTypes.MoveToArchive,
      TaskActionTypes.ConvertToMainTask,
    ),
    switchMap(
      (
        a:
          | AddTask
          | DeleteTask
          | MoveToOtherProject
          | MoveToArchive
          | RestoreTask
          | ConvertToMainTask
          | Action,
      ) => {
        let isChange = false;
        switch (a.type) {
          case TaskActionTypes.AddTask:
            isChange = !!(a as AddTask).payload.task.projectId;
            break;
          case TaskActionTypes.DeleteTask:
            isChange = !!(a as DeleteTask).payload.task.projectId;
            break;
          case TaskActionTypes.MoveToOtherProject:
            isChange = !!(a as MoveToOtherProject).payload.task.projectId;
            break;
          case TaskActionTypes.MoveToArchive:
            isChange = !!(a as MoveToArchive).payload.tasks.find(
              (task) => !!task.projectId,
            );
            break;
          case TaskActionTypes.RestoreTask:
            isChange = !!(a as RestoreTask).payload.task.projectId;
            break;
          case TaskActionTypes.ConvertToMainTask:
            isChange = !!(a as ConvertToMainTask).payload.task.projectId;
            break;
        }
        return isChange ? of(a) : EMPTY;
      },
    ),
    switchMap(() => this.saveToLs$(true)),
  );
  @Effect({ dispatch: false })
  updateProjectStorageConditional$: Observable<unknown> = this._actions$.pipe(
    ofType(moveTaskInTodayList, moveTaskUpInTodayList, moveTaskDownInTodayList),
    filter((p) => p.workContextType === WorkContextType.PROJECT),
    switchMap(() => this.saveToLs$(true)),
  );
  @Effect()
  updateWorkStart$: any = this._actions$.pipe(
    ofType(TaskActionTypes.AddTimeSpent),
    filter((action: AddTimeSpent) => !!action.payload.task.projectId),
    concatMap((action: AddTimeSpent) =>
      this._projectService
        .getByIdOnce$(action.payload.task.projectId as string)
        .pipe(first()),
    ),
    filter((project: Project) => !project.workStart[getWorklogStr()]),
    map((project) => {
      return new UpdateProjectWorkStart({
        id: project.id,
        date: getWorklogStr(),
        newVal: Date.now(),
      });
    }),
  );

  @Effect()
  updateWorkEnd$: Observable<unknown> = this._actions$.pipe(
    ofType(TaskActionTypes.AddTimeSpent),
    filter((action: AddTimeSpent) => !!action.payload.task.projectId),
    map((action: AddTimeSpent) => {
      return new UpdateProjectWorkEnd({
        id: action.payload.task.projectId as string,
        date: getWorklogStr(),
        newVal: Date.now(),
      });
    }),
  );

  @Effect()
  onProjectIdChange$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext),
    filter(({ activeType }) => activeType === WorkContextType.PROJECT),
    switchMap((action) => {
      const projectId = action.activeId;
      return Promise.all([
        this._noteService.loadStateForProject(projectId),
        this._bookmarkService.loadStateForProject(projectId),
      ]).then(() => projectId);
    }),
    map((projectId) => {
      return new LoadProjectRelatedDataSuccess({ projectId });
    }),
  );

  // TODO a solution for orphaned tasks might be needed
  @Effect({ dispatch: false })
  deleteProjectRelatedData: Observable<unknown> = this._actions$.pipe(
    ofType(ProjectActionTypes.DeleteProject),
    tap(async (action: DeleteProject) => {
      await this._persistenceService.removeCompleteRelatedDataForProject(
        action.payload.id,
      );
      this._reminderService.removeRemindersByWorkContextId(action.payload.id);
      this._removeAllTasksForProject(action.payload.id);
      this._removeAllArchiveTasksForProject(action.payload.id);
      this._removeAllRepeatingTasksForProject(action.payload.id);

      // we also might need to account for this unlikely but very nasty scenario
      const misc = await this._globalConfigService.misc$.pipe(take(1)).toPromise();
      if (action.payload.id === misc.defaultProjectId) {
        this._globalConfigService.updateSection('misc', { defaultProjectId: null });
      }
    }),
  );

  @Effect({ dispatch: false })
  archiveProject: Observable<unknown> = this._actions$.pipe(
    ofType(ProjectActionTypes.ArchiveProject),
    tap(async (action: ArchiveProject) => {
      await this._persistenceService.archiveProject(action.payload.id);
      this._reminderService.removeRemindersByWorkContextId(action.payload.id);
      this._snackService.open({
        ico: 'archive',
        msg: T.F.PROJECT.S.ARCHIVED,
      });
    }),
  );

  @Effect({ dispatch: false })
  unarchiveProject: Observable<unknown> = this._actions$.pipe(
    ofType(ProjectActionTypes.UnarchiveProject),
    tap(async (action: UnarchiveProject) => {
      await this._persistenceService.unarchiveProject(action.payload.id);

      this._snackService.open({
        ico: 'unarchive',
        msg: T.F.PROJECT.S.UNARCHIVED,
      });
    }),
  );

  // PURE SNACKS
  // -----------
  @Effect({ dispatch: false })
  snackUpdateIssueProvider$: Observable<unknown> = this._actions$.pipe(
    ofType(ProjectActionTypes.UpdateProjectIssueProviderCfg),
    tap((action: UpdateProjectIssueProviderCfg) => {
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PROJECT.S.ISSUE_PROVIDER_UPDATED,
        translateParams: {
          issueProviderKey: action.payload.issueProviderKey,
        },
      });
    }),
  );

  @Effect({ dispatch: false })
  snackUpdateBaseSettings$: Observable<unknown> = this._actions$.pipe(
    ofType(ProjectActionTypes.UpdateProject),
    tap((action: UpdateProject) => {
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PROJECT.S.UPDATED,
      });
    }),
  );

  @Effect({ dispatch: false })
  onProjectCreatedSnack: Observable<unknown> = this._actions$.pipe(
    ofType(ProjectActionTypes.AddProject),
    tap((action: AddProject) => {
      this._snackService.open({
        ico: 'add',
        type: 'SUCCESS',
        msg: T.F.PROJECT.S.CREATED,
        translateParams: { title: action.payload.project.title },
      });
    }),
  );

  @Effect({ dispatch: false })
  showDeletionSnack: Observable<unknown> = this._actions$.pipe(
    ofType(ProjectActionTypes.DeleteProject),
    tap((action: DeleteProject) => {
      this._snackService.open({
        ico: 'delete_forever',
        msg: T.F.PROJECT.S.DELETED,
      });
    }),
  );

  @Effect()
  moveToTodayListOnAddTodayTag: Observable<unknown> = this._actions$.pipe(
    ofType(TaskActionTypes.UpdateTaskTags),
    filter(
      (action: UpdateTaskTags) =>
        !!action.payload.task.projectId &&
        action.payload.newTagIds.includes(TODAY_TAG.id),
    ),
    concatMap((action) =>
      this._projectService.getByIdOnce$(action.payload.task.projectId as string).pipe(
        map((project) => ({
          project,
          p: action.payload,
        })),
      ),
    ),
    filter(({ project }) => !project.taskIds.includes(TODAY_TAG.id)),
    map(({ p, project }) =>
      moveTaskToTodayListAuto({
        workContextId: project.id,
        taskId: p.task.id,
        isMoveToTop: false,
      }),
    ),
  );

  // @Effect()
  // moveToBacklogOnRemoveTodayTag: Observable<unknown> = this._actions$.pipe(
  //   ofType(TaskActionTypes.UpdateTaskTags),
  //   filter((action: UpdateTaskTags) =>
  //     action.payload.task.projectId &&
  //     action.payload.oldTagIds.includes(TODAY_TAG.id)
  //   ),
  //   concatMap((action) => this._projectService.getByIdOnce$(action.payload.task.projectId).pipe(
  //     map((project) => ({
  //       project,
  //       p: action.payload,
  //     }))
  //   )),
  //   filter(({project}) => !project.taskIds.includes(TODAY_TAG.id)),
  //   map(({p, project}) => moveTaskToTodayList({
  //     workContextId: project.id,
  //     taskId: p.task.id,
  //     newOrderedIds: [p.task.id, ...project.backlogTaskIds],
  //     src: 'DONE',
  //     target: 'BACKLOG'
  //   })),
  // );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _persistenceService: PersistenceService,
    private _bookmarkService: BookmarkService,
    private _noteService: NoteService,
    private _globalConfigService: GlobalConfigService,
    private _reminderService: ReminderService,
    // private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
  ) {}

  private async _removeAllTasksForProject(projectIdToDelete: string): Promise<any> {
    const taskState: TaskState = await this._taskService.taskFeatureState$
      .pipe(
        filter((s) => s.isDataLoaded),
        first(),
      )
      .toPromise();
    const nonArchiveTaskIdsToDelete = taskState.ids.filter((id) => {
      const t = taskState.entities[id] as Task;
      if (!t) {
        throw new Error('No task');
      }
      // NOTE sub tasks are accounted for in DeleteMainTasks action
      return t.projectId === projectIdToDelete && !t.parentId;
    });

    console.log(
      'TaskIds to remove/unique',
      nonArchiveTaskIdsToDelete,
      unique(nonArchiveTaskIdsToDelete),
    );
    this._taskService.removeMultipleMainTasks(nonArchiveTaskIdsToDelete);
  }

  private async _removeAllArchiveTasksForProject(
    projectIdToDelete: string,
  ): Promise<any> {
    const taskArchiveState: TaskArchive =
      await this._persistenceService.taskArchive.loadState();
    // NOTE: task archive might not if there never was a day completed
    const archiveTaskIdsToDelete = !!taskArchiveState
      ? (taskArchiveState.ids as string[]).filter((id) => {
          const t = taskArchiveState.entities[id] as Task;
          if (!t) {
            throw new Error('No task');
          }
          // NOTE sub tasks are accounted for in DeleteMainTasks action
          return t.projectId === projectIdToDelete && !t.parentId;
        })
      : [];
    console.log(
      'Archive TaskIds to remove/unique',
      archiveTaskIdsToDelete,
      unique(archiveTaskIdsToDelete),
    );
    // remove archive
    await this._persistenceService.taskArchive.execAction(
      new DeleteMainTasks({ taskIds: archiveTaskIdsToDelete }),
    );
  }

  private async _removeAllRepeatingTasksForProject(
    projectIdToDelete: string,
  ): Promise<any> {
    const taskRepeatCfgs: TaskRepeatCfg[] =
      await this._taskRepeatCfgService.taskRepeatCfgs$.pipe(first()).toPromise();
    const allCfgIdsForProject = taskRepeatCfgs.filter(
      (cfg) => cfg.projectId === projectIdToDelete,
    );

    const cfgsIdsToRemove: string[] = allCfgIdsForProject
      .filter((cfg) => !cfg.tagIds || cfg.tagIds.length === 0)
      .map((cfg) => cfg.id as string);
    if (cfgsIdsToRemove.length > 0) {
      this._taskRepeatCfgService.deleteTaskRepeatCfgsNoTaskCleanup(cfgsIdsToRemove);
    }

    const cfgsToUpdate: string[] = allCfgIdsForProject
      .filter((cfg) => cfg.tagIds && cfg.tagIds.length > 0)
      .map((taskRepeatCfg) => taskRepeatCfg.id as string);
    if (cfgsToUpdate.length > 0) {
      this._taskRepeatCfgService.updateTaskRepeatCfgs(cfgsToUpdate, { projectId: null });
    }
  }

  private saveToLs$(isSyncModelChange: boolean): Observable<unknown> {
    return this._store$.pipe(
      // tap(() => console.log('SAVE')),
      select(selectProjectFeatureState),
      take(1),
      switchMap((projectState) =>
        this._persistenceService.project.saveState(projectState, { isSyncModelChange }),
      ),
    );
  }
}
