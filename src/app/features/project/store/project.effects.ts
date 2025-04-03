import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import {
  addProject,
  addProjects,
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
  upsertProject,
} from './project.actions';
import { SnackService } from '../../../core/snack/snack.service';
import {
  addTask,
  convertToMainTask,
  deleteTask,
  moveToArchive_,
  moveToOtherProject,
  restoreTask,
} from '../../tasks/store/task.actions';
import { GlobalConfigService } from '../../config/global-config.service';
import { T } from '../../../t.const';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import { WorkContextType } from '../../work-context/work-context.model';
import { Project } from '../project.model';
import { EMPTY, Observable, of } from 'rxjs';
import { selectProjectFeatureState } from './project.selectors';
import {
  addNote,
  deleteNote,
  moveNoteToOtherProject,
  updateNoteOrder,
} from '../../note/store/note.actions';
import { ReminderService } from '../../reminder/reminder.service';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';

@Injectable()
export class ProjectEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _snackService = inject(SnackService);
  private _taskArchiveService = inject(TaskArchiveService);
  private _pfapiService = inject(PfapiService);
  private _globalConfigService = inject(GlobalConfigService);
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
          return this.saveToLs$(true);
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

  // TODO a solution for orphaned tasks might be needed

  deleteProjectRelatedData: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteProject),
        tap(async ({ project, allTaskIds }) => {
          // NOTE: we also do stuff on a reducer level (probably better to handle on this level @TODO refactor)
          const id = project.id as string;
          this._taskArchiveService.removeAllArchiveTasksForProject(id);
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
  //         await this._pfapiService.archiveProject(id);
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
  //         await this._pfapiService.unarchiveProject(id);
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

  private saveToLs$(isUpdateRevAndLastUpdate: boolean): Observable<unknown> {
    return this._store$.pipe(
      // tap(() => console.log('SAVE')),
      select(selectProjectFeatureState),
      take(1),
      switchMap((projectState) =>
        this._pfapiService.m.project.save(projectState, {
          isUpdateRevAndLastUpdate,
        }),
      ),
    );
  }
}
