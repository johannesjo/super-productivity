import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { concatMap, filter, first, map, switchMap, take, tap } from 'rxjs/operators';
import {
  addProject,
  addProjects,
  addToProjectBreakTime,
  archiveProject,
  deleteProject,
  moveAllProjectBacklogTasksToRegularList,
  moveProjectTaskDownInBacklogList,
  moveProjectTaskInBacklogList,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBacklogListAuto,
  moveProjectTaskToBottomInBacklogList,
  moveProjectTaskToRegularList,
  moveProjectTaskToRegularListAuto,
  moveProjectTaskToTopInBacklogList,
  moveProjectTaskUpInBacklogList,
  unarchiveProject,
  updateProject,
  updateProjectAdvancedCfg,
  updateProjectOrder,
  updateProjectWorkEnd,
  updateProjectWorkStart,
  upsertProject,
} from './project.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { SnackService } from '../../../core/snack/snack.service';
import {
  addTask,
  addTimeSpent,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveToArchive_,
  moveToOtherProject,
  restoreTask,
} from '../../tasks/store/task.actions';
import { ProjectService } from '../project.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { T } from '../../../t.const';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import { WorkContextType } from '../../work-context/work-context.model';
import { Project } from '../project.model';
import { Task, TaskArchive } from '../../tasks/task.model';
import { unique } from '../../../util/unique';
import { EMPTY, Observable, of } from 'rxjs';
import { selectProjectFeatureState } from './project.selectors';
import {
  addNote,
  deleteNote,
  moveNoteToOtherProject,
  updateNoteOrder,
} from '../../note/store/note.actions';
import { DateService } from 'src/app/core/date/date.service';
import { ReminderService } from '../../reminder/reminder.service';

@Injectable()
export class ProjectEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _snackService = inject(SnackService);
  private _projectService = inject(ProjectService);
  private _persistenceService = inject(PersistenceService);
  private _globalConfigService = inject(GlobalConfigService);
  private _dateService = inject(DateService);
  private _reminderService = inject(ReminderService);

  syncProjectToLs$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addProject.type,
          addProjects.type,
          upsertProject.type,
          deleteProject.type,
          updateProject.type,
          updateProjectAdvancedCfg.type,
          updateProjectWorkStart.type,
          updateProjectWorkEnd.type,
          addToProjectBreakTime.type,
          updateProjectOrder.type,
          archiveProject.type,
          unarchiveProject.type,
          moveToOtherProject.type,
          moveNoteToOtherProject.type,

          moveProjectTaskInBacklogList.type,
          moveProjectTaskToBacklogList.type,
          moveProjectTaskToRegularList.type,
          moveProjectTaskUpInBacklogList.type,
          moveProjectTaskDownInBacklogList.type,
          moveProjectTaskToTopInBacklogList.type,
          moveProjectTaskToBottomInBacklogList.type,
          moveProjectTaskToBacklogListAuto.type,
          moveProjectTaskToRegularListAuto.type,
        ),
        switchMap((a) => {
          // exclude ui only actions
          if (
            [updateProjectWorkStart.type, updateProjectWorkEnd.type].includes(
              a.type as any,
            )
          ) {
            return this.saveToLs$(false);
          } else {
            return this.saveToLs$(true);
          }
        }),
      ),
    { dispatch: false },
  );

  updateProjectStorageConditionalNote$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateNoteOrder, addNote, deleteNote),
        switchMap((a) => {
          let isChange = false;
          switch (a.type) {
            case updateNoteOrder.type:
              isChange = a.activeContextType === WorkContextType.PROJECT;
              break;
            case addNote.type:
              isChange = !!a.note.projectId;
              break;
            case deleteNote.type:
              isChange = !!a.projectId;
              break;
          }
          return isChange ? of(a) : EMPTY;
        }),
        switchMap(() => this.saveToLs$(true)),
      ),
    { dispatch: false },
  );

  updateProjectStorageConditionalTask$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addTask,
          deleteTask,
          moveToOtherProject,
          restoreTask,
          moveToArchive_,
          convertToMainTask,
        ),
        switchMap((a) => {
          let isChange = false;
          switch (a.type) {
            case addTask.type:
              isChange = !!a.task.projectId;
              break;
            case deleteTask.type:
              isChange = !!a.task.projectId;
              break;
            case moveToOtherProject.type:
              isChange = !!a.task.projectId;
              break;
            case moveToArchive_.type:
              isChange = !!a.tasks.find((task) => !!task.projectId);
              break;
            case restoreTask.type:
              isChange = !!a.task.projectId;
              break;
            case convertToMainTask.type:
              isChange = !!a.task.projectId;
              break;
          }
          return isChange ? of(a) : EMPTY;
        }),
        switchMap(() => this.saveToLs$(true)),
      ),
    { dispatch: false },
  );

  updateProjectStorageConditional$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveTaskInTodayList, moveTaskUpInTodayList, moveTaskDownInTodayList),
        filter((p) => p.workContextType === WorkContextType.PROJECT),
        switchMap(() => this.saveToLs$(true)),
      ),
    { dispatch: false },
  );

  updateWorkStart$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTimeSpent),
      filter(({ task }) => !!task.projectId),
      concatMap(({ task }) =>
        this._projectService.getByIdOnce$(task.projectId as string).pipe(first()),
      ),
      filter((project: Project) => !project.workStart[this._dateService.todayStr()]),
      map((project) => {
        return updateProjectWorkStart({
          id: project.id,
          date: this._dateService.todayStr(),
          newVal: Date.now(),
        });
      }),
    ),
  );

  updateWorkEnd$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(addTimeSpent),
      filter(({ task }) => !!task.projectId),
      map(({ task }) => {
        return updateProjectWorkEnd({
          id: task.projectId as string,
          date: this._dateService.todayStr(),
          newVal: Date.now(),
        });
      }),
    ),
  );

  // TODO a solution for orphaned tasks might be needed

  deleteProjectRelatedData: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteProject),
        tap(async ({ project, allTaskIds }) => {
          // NOTE: we also do stuff on a reducer level (probably better to handle on this level @TODO refactor)
          const id = project.id as string;
          this._removeAllArchiveTasksForProject(id);
          this._reminderService.removeRemindersByRelatedIds(allTaskIds);

          // we also might need to account for this unlikely but very nasty scenario
          const cfg = await this._globalConfigService.cfg$.pipe(take(1)).toPromise();
          if (id === cfg.misc.defaultProjectId) {
            this._globalConfigService.updateSection('misc', { defaultProjectId: null });
          }
        }),
      ),
    { dispatch: false },
  );

  moveAllProjectToTodayListWhenBacklogIsDisabled$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateProject),
        filter((a) => a.project.changes.isEnableBacklog === false),
        map((a) => {
          return moveAllProjectBacklogTasksToRegularList({
            projectId: a.project.id as string,
          });
        }),
      ),
  );

  // CURRENTLY NOT IMPLEMENTED
  // archiveProject: Observable<unknown> = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(archiveProject.type),
  //       tap(async ({ id }) => {
  //         await this._persistenceService.archiveProject(id);
  //         // TODO remove reminders
  //         this._snackService.open({
  //           ico: 'archive',
  //           msg: T.F.PROJECT.S.ARCHIVED,
  //         });
  //       }),
  //     ),
  //   { dispatch: false },
  // );
  // unarchiveProject: Observable<unknown> = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(unarchiveProject.type),
  //       tap(async ({ id }) => {
  //         await this._persistenceService.unarchiveProject(id);
  //
  //         this._snackService.open({
  //           ico: 'unarchive',
  //           msg: T.F.PROJECT.S.UNARCHIVED,
  //         });
  //       }),
  //     ),
  //   { dispatch: false },
  // );

  // PURE SNACKS
  // -----------

  snackUpdateBaseSettings$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateProject.type),
        tap(() => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.PROJECT.S.UPDATED,
          });
        }),
      ),
    { dispatch: false },
  );

  onProjectCreatedSnack: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addProject.type),
        tap(({ project }) => {
          this._snackService.open({
            ico: 'add',
            type: 'SUCCESS',
            msg: T.F.PROJECT.S.CREATED,
            translateParams: { title: (project as Project).title },
          });
        }),
      ),
    { dispatch: false },
  );

  showDeletionSnack: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteProject.type),
        tap(() => {
          this._snackService.open({
            ico: 'delete_forever',
            msg: T.F.PROJECT.S.DELETED,
          });
        }),
      ),
    { dispatch: false },
  );

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
          return t.projectId === projectIdToDelete;
        })
      : [];
    console.log(
      'Archive TaskIds to remove/unique',
      archiveTaskIdsToDelete,
      unique(archiveTaskIdsToDelete),
    );
    // remove archive
    await this._persistenceService.taskArchive.execAction(
      deleteTasks({ taskIds: archiveTaskIdsToDelete }),
      true,
    );
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
