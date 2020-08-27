import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {AddTask, DeleteTask, TaskActionTypes, UpdateTask} from './task.actions';
import {Action, select, Store} from '@ngrx/store';
import {filter, tap, throttleTime, withLatestFrom} from 'rxjs/operators';
import {selectCurrentTask} from './task.selectors';
import {NotifyService} from '../../../core/notify/notify.service';
import {TaskService} from '../task.service';
import {selectConfigFeatureState} from '../../config/store/global-config.reducer';
import {truncate} from '../../../util/truncate';
import {BannerService} from '../../../core/banner/banner.service';
import {BannerId} from '../../../core/banner/banner.model';
import {T} from '../../../t.const';
import {SnackService} from '../../../core/snack/snack.service';
import {GlobalConfigState} from '../../config/global-config.model';

@Injectable()
export class TaskUiEffects {
  @Effect({dispatch: false})
  taskCreatedSnack$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.AddTask,
    ),
    tap((a: AddTask) => this._snackService.open({
      type: 'SUCCESS',
      translateParams: {
        title: truncate(a.payload.task.title)
      },
      msg: T.F.TASK.S.TASK_CREATED,
      ico: 'add',
    })),
  );

  @Effect({dispatch: false})
  snackDelete$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.DeleteTask,
    ),
    tap((actionIN: DeleteTask) => {
      const action = actionIN as DeleteTask;
      this._snackService.open({
        translateParams: {
          title: truncate(action.payload.task.title)
        },
        msg: T.F.TASK.S.DELETED,
        config: {duration: 5000},
        actionStr: T.G.UNDO,
        actionId: TaskActionTypes.UndoDeleteTask
      });
    })
  );

  @Effect({dispatch: false})
  timeEstimateExceeded$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.AddTimeSpent,
    ),
    // refresh every 10 minute max
    throttleTime(10 * 60 * 1000),
    withLatestFrom(
      this._store$.pipe(select(selectCurrentTask)),
      this._store$.pipe(select(selectConfigFeatureState)),
    ),
    tap((args) => this._notifyAboutTimeEstimateExceeded(args))
  );


  @Effect({dispatch: false})
  taskDoneSound$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.UpdateTask,
    ),
    filter(({payload: {task: {changes}}}: UpdateTask) => !!changes.isDone),
    tap(() => this._playDoneSound())
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _notifyService: NotifyService,
    private _taskService: TaskService,
    private _bannerService: BannerService,
    private _snackService: SnackService,
  ) {
  }

  private _playDoneSound() {
    const a = new Audio('/assets/snd/done4.mp3')
    a.volume = .4;
    a.playbackRate = 1.5;
    a.play();
  }

  private _notifyAboutTimeEstimateExceeded([action, ct, globalCfg]: [Action, any, GlobalConfigState]) {
    if (globalCfg && globalCfg.misc.isNotifyWhenTimeEstimateExceeded
      && ct && ct.timeEstimate > 0
      && ct.timeSpent > ct.timeEstimate) {
      const title = truncate(ct.title);

      this._notifyService.notify({
        title: T.F.TASK.N.ESTIMATE_EXCEEDED,
        body: T.F.TASK.N.ESTIMATE_EXCEEDED_BODY,
        translateParams: {title},
      });

      this._bannerService.open({
        msg: T.F.TASK.B.ESTIMATE_EXCEEDED,
        id: BannerId.TimeEstimateExceeded,
        ico: 'timer',
        translateParams: {title},
        action: {
          label: T.F.TASK.B.ADD_HALF_HOUR,
          fn: () => this._taskService.update(ct.id, {
            timeEstimate: (ct.timeSpent + 30 * 60000)
          })
        }
      });
    }
  }
}


