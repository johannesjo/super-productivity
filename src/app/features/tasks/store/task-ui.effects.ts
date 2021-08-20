import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addTask,
  addTimeSpent,
  deleteTask,
  undoDeleteTask,
  updateTask,
} from './task.actions';
import { Action, select, Store } from '@ngrx/store';
import { filter, tap, throttleTime, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from './task.selectors';
import { NotifyService } from '../../../core/notify/notify.service';
import { TaskService } from '../task.service';
import { selectConfigFeatureState } from '../../config/store/global-config.reducer';
import { truncate } from '../../../util/truncate';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { GlobalConfigState } from '../../config/global-config.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { playDoneSound } from '../util/play-done-sound';

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
      this._actions$.pipe(
        ofType(addTimeSpent),
        // refresh every 10 minute max
        throttleTime(10 * 60 * 1000),
        withLatestFrom(
          this._store$.pipe(select(selectCurrentTask)),
          this._store$.pipe(select(selectConfigFeatureState)),
        ),
        tap((args) => this._notifyAboutTimeEstimateExceeded(args)),
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
        filter(([, , soundCfg]) => soundCfg.isPlayDoneSound),
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

  private _notifyAboutTimeEstimateExceeded([action, ct, globalCfg]: [
    Action,
    any,
    GlobalConfigState,
  ]): void {
    if (
      globalCfg &&
      globalCfg.misc.isNotifyWhenTimeEstimateExceeded &&
      ct &&
      ct.timeEstimate > 0 &&
      ct.timeSpent > ct.timeEstimate
    ) {
      const title = truncate(ct.title);

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
            this._taskService.update(ct.id, {
              // prettier-ignore
              timeEstimate: ct.timeSpent + (30 * 60000),
            }),
        },
      });
    }
  }
}
