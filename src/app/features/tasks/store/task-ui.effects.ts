import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTask,
  deleteTask,
  moveToOtherProject,
  undoDeleteTask,
  updateTask,
} from './task.actions';
import { select, Store } from '@ngrx/store';
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  skip,
  switchMap,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { selectCurrentTask, selectCurrentTaskId } from './task.selectors';
import { NotifyService } from '../../../core/notify/notify.service';
import { TaskService } from '../task.service';
import { selectConfigFeatureState } from '../../config/store/global-config.reducer';
import { truncate } from '../../../util/truncate';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { playDoneSound } from '../util/play-done-sound';
import { Task } from '../task.model';
import { EMPTY } from 'rxjs';
import { selectProjectById } from '../../project/store/project.selectors';
import { Router } from '@angular/router';
import { WorkContextType } from '../../work-context/work-context.model';
import { INBOX_PROJECT } from '../../project/project.const';

@Injectable()
export class TaskUiEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _notifyService = inject(NotifyService);
  private _taskService = inject(TaskService);
  private _router = inject(Router);
  private _bannerService = inject(BannerService);
  private _snackService = inject(SnackService);
  private _globalConfigService = inject(GlobalConfigService);
  private _workContextService = inject(WorkContextService);

  taskCreatedSnack$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTask),
        tap(({ task }) =>
          this._snackService.open({
            type: 'SUCCESS',
            translateParams: {
              title: truncate(task.title),
            },
            msg: T.F.TASK.S.TASK_CREATED,
            ico: 'add',
          }),
        ),
      ),
    { dispatch: false },
  );

  snackDelete$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTask),
        tap(({ task }) => {
          this._snackService.open({
            translateParams: {
              title: truncate(task.title),
            },
            msg: T.F.TASK.S.DELETED,
            config: { duration: 5000 },
            actionStr: T.G.UNDO,
            actionId: undoDeleteTask.type,
          });
        }),
      ),
    { dispatch: false },
  );

  timeEstimateExceeded$: any = createEffect(
    () =>
      this._store$.pipe(select(selectConfigFeatureState)).pipe(
        switchMap((globalCfg) =>
          globalCfg && globalCfg.timeTracking.isNotifyWhenTimeEstimateExceeded
            ? // reset whenever the current taskId changes (but no the task data, which is polled afterwards)
              this._store$.pipe(select(selectCurrentTaskId)).pipe(
                distinctUntilChanged(),
                switchMap(() =>
                  this._store$.pipe(
                    select(selectCurrentTask),
                    filter(
                      (currentTask) =>
                        !!currentTask &&
                        currentTask.timeEstimate > 0 &&
                        currentTask.timeSpent > currentTask.timeEstimate,
                    ),
                    // refresh every 10 minute max
                    throttleTime(10 * 60 * 1000),
                    tap((currentTask) => {
                      this._notifyAboutTimeEstimateExceeded(currentTask as Task);
                    }),
                  ),
                ),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
  );

  timeEstimateExceededDismissBanner$: any = createEffect(
    () =>
      this._store$.pipe(select(selectConfigFeatureState)).pipe(
        switchMap((globalCfg) =>
          globalCfg && globalCfg.timeTracking.isNotifyWhenTimeEstimateExceeded
            ? this._bannerService.activeBanner$.pipe(
                switchMap((activeBanner) =>
                  activeBanner?.id === BannerId.TimeEstimateExceeded
                    ? this._store$.pipe(
                        select(selectCurrentTaskId),
                        distinctUntilChanged(),
                        skip(1),
                      )
                    : EMPTY,
                ),
                tap(() => {
                  this._bannerService.dismiss(BannerId.TimeEstimateExceeded);
                }),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
  );

  taskDoneSound$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task: { changes } }) => !!changes.isDone),
        withLatestFrom(
          this._workContextService.flatDoneTodayNr$,
          this._globalConfigService.sound$,
        ),
        filter(([, , soundCfg]) => !!soundCfg.doneSound),
        tap(([, doneToday, soundCfg]) => playDoneSound(soundCfg, doneToday)),
      ),
    { dispatch: false },
  );

  goToProjectSnack$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveToOtherProject),
        filter(
          ({ targetProjectId }) =>
            targetProjectId !== this._workContextService.activeWorkContextId,
        ),
        withLatestFrom(this._workContextService.todaysTaskIds$),
        filter(
          ([{ task }, activeContextTaskIds]) => !activeContextTaskIds.includes(task.id),
        ),
        switchMap(([{ targetProjectId, task }]) =>
          this._store$.select(selectProjectById, { id: targetProjectId }).pipe(
            first(),
            map((project) => ({ project, task })),
          ),
        ),
        tap(({ project, task }) =>
          this._snackService.open({
            type: 'SUCCESS',
            translateParams: {
              taskTitle: truncate(task.title),
              projectTitle: truncate(project.title),
            },
            msg: T.F.TASK.S.MOVED_TO_PROJECT,
            ico: 'add',
            actionFn: () => {
              this._router.navigate([`project/${project.id}/tasks`]);
            },
            actionStr: T.F.TASK.S.MOVED_TO_PROJECT_ACTION,
          }),
        ),
      ),
    { dispatch: false },
  );

  goToProjectOnCreation$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addTask),
        filter(
          ({ task }) =>
            !!task.projectId &&
            (this._workContextService.activeWorkContextType === WorkContextType.PROJECT
              ? task.projectId !== this._workContextService.activeWorkContextId
              : !task.tagIds.includes(
                  this._workContextService.activeWorkContextId as string,
                ) && task.projectId !== INBOX_PROJECT.id),
        ),
        switchMap(({ task }) =>
          this._store$.select(selectProjectById, { id: task.projectId as string }).pipe(
            first(),
            map((project) => ({ project, task })),
          ),
        ),
        tap(({ project, task }) =>
          this._snackService.open({
            type: 'SUCCESS',
            translateParams: {
              taskTitle: truncate(task.title),
              projectTitle: truncate(project.title),
            },
            msg: T.F.TASK.S.CREATED_FOR_PROJECT,
            ico: 'add',
            actionFn: () => {
              this._router.navigate([`project/${project.id}/tasks`]);
            },
            actionStr: T.F.TASK.S.CREATED_FOR_PROJECT_ACTION,
          }),
        ),
      ),
    { dispatch: false },
  );

  private _notifyAboutTimeEstimateExceeded(currentTask: Task): void {
    const title = truncate(currentTask.title);

    this._notifyService.notify({
      title: T.F.TASK.N.ESTIMATE_EXCEEDED,
      body: T.F.TASK.N.ESTIMATE_EXCEEDED_BODY,
      translateParams: { title },
    });

    this._bannerService.open({
      msg: T.F.TASK.B.ESTIMATE_EXCEEDED,
      id: BannerId.TimeEstimateExceeded,
      ico: 'timer',
      translateParams: { title },
      action: {
        label: T.F.TASK.B.ADD_HALF_HOUR,
        fn: () =>
          this._taskService.update(currentTask.id, {
            // prettier-ignore
            timeEstimate: currentTask.timeSpent + (30 * 60000),
          }),
      },
      hideWhen$: this._taskService.currentTaskId$.pipe(
        filter((id) => id !== currentTask.id),
      ),
    });
  }
}
