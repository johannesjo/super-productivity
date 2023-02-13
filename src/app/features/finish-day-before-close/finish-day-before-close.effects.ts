import { Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { ExecBeforeCloseService } from '../../core/electron/exec-before-close.service';
import { GlobalConfigService } from '../config/global-config.service';
import {
  concatMap,
  distinctUntilChanged,
  first,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { DataInitService } from '../../core/data-init/data-init.service';
import { IS_ELECTRON } from '../../app.constants';
import { EMPTY, Observable } from 'rxjs';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskService } from '../tasks/task.service';
import { Router } from '@angular/router';
import { TODAY_TAG } from '../tag/tag.const';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';

const EXEC_BEFORE_CLOSE_ID = 'FINISH_DAY_BEFORE_CLOSE_EFFECT';

@Injectable()
export class FinishDayBeforeCloseEffects {
  isEnabled$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._globalConfigService.misc$),
    map((misc) => misc.isConfirmBeforeExitWithoutFinishDay),
    distinctUntilChanged(),
  );

  scheduleUnscheduleFinishDayBeforeClose$ =
    IS_ELECTRON &&
    createEffect(
      () =>
        this.isEnabled$.pipe(
          tap((isEnabled) =>
            isEnabled
              ? this._execBeforeCloseService.schedule(EXEC_BEFORE_CLOSE_ID)
              : this._execBeforeCloseService.unschedule(EXEC_BEFORE_CLOSE_ID),
          ),
        ),
      { dispatch: false },
    );

  warnToFinishDayBeforeClose$ =
    IS_ELECTRON &&
    createEffect(
      () =>
        this.isEnabled$.pipe(
          switchMap((isEnabled) =>
            isEnabled ? this._execBeforeCloseService.onBeforeClose$ : EMPTY,
          ),
          switchMap(() =>
            this._workContextService.mainWorkContext$.pipe(
              first(),
              switchMap((workContext) =>
                this._taskService.getByIdsLive$(workContext.taskIds).pipe(first()),
              ),
            ),
          ),
          tap((todayMainTasks) => {
            const doneTasks = todayMainTasks.filter((t) => t.isDone);
            if (doneTasks.length) {
              if (
                confirm(
                  this._translateService.instant(
                    T.F.FINISH_DAY_BEFORE_EXIT.C.FINISH_DAY_BEFORE_EXIT,
                    {
                      nr: doneTasks.length,
                    },
                  ),
                )
              ) {
                this._execBeforeCloseService.setDone(EXEC_BEFORE_CLOSE_ID);
              } else {
                this._router.navigate([`tag/${TODAY_TAG.id}/daily-summary`]);
              }
            } else {
              this._execBeforeCloseService.setDone(EXEC_BEFORE_CLOSE_ID);
            }
          }),
        ),
      { dispatch: false },
    );

  constructor(
    private actions$: Actions,
    private _execBeforeCloseService: ExecBeforeCloseService,
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _router: Router,
    private _translateService: TranslateService,
  ) {}
}
