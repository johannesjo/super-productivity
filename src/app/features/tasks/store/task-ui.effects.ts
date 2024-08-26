import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { addTask, deleteTask, undoDeleteTask, updateTask } from './task.actions';
import { select, Store } from '@ngrx/store';
import {
  distinctUntilChanged,
  filter,
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

@Injectable()
export class TaskUiEffects {
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

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _notifyService: NotifyService,
    private _taskService: TaskService,
    private _bannerService: BannerService,
    private _snackService: SnackService,
    private _globalConfigService: GlobalConfigService,
    private _workContextService: WorkContextService,
  ) {}

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
    });
  }
}
