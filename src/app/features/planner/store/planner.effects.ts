import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PlannerActions } from './planner.actions';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { selectPlannerState } from './planner.selectors';
import { PlannerState } from './planner.reducer';
import { unScheduleTask, updateTaskTags } from '../../tasks/store/task.actions';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { planTasksForToday } from '../../tag/store/tag.actions';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from 'src/app/t.const';
import { PlannerService } from '../planner.service';
import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { getWorklogStr } from '../../../util/get-work-log-str';

@Injectable()
export class PlannerEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _pfapiService = inject(PfapiService);

  private _snackService = inject(SnackService);
  private _plannerService = inject(PlannerService);
  private _datePipe = inject(DatePipe);
  private _translateService = inject(TranslateService);

  saveToDB$ = createEffect(
    () => {
      return this._actions$.pipe(
        ofType(
          PlannerActions.updatePlannerDialogLastShown,
          PlannerActions.upsertPlannerDay,
          PlannerActions.cleanupOldAndUndefinedPlannerTasks,
          PlannerActions.moveInList,
          PlannerActions.transferTask,
          PlannerActions.planTaskForDay,
          PlannerActions.moveBeforeTask,
          updateTaskTags,
          unScheduleTask,
          planTasksForToday,
        ),
        withLatestFrom(this._store.pipe(select(selectPlannerState))),
        tap(([, plannerState]) => this._saveToLs(plannerState)),
      );
    },
    { dispatch: false },
  );

  planForDaySnack$ = createEffect(
    () => {
      return this._actions$.pipe(
        ofType(PlannerActions.planTaskForDay),
        filter((action) => !!action.isShowSnack),
        tap(async (action) => {
          const isForToday = action.day === getWorklogStr();
          const formattedDate = isForToday
            ? this._translateService.instant(T.G.TODAY_TAG_TITLE)
            : (this._datePipe.transform(action.day, 'shortDate') as string);

          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
            ico: 'today',
            translateParams: {
              date: formattedDate,
              extra: await this._plannerService.getSnackExtraStr(action.day),
            },
          });
        }),
      );
    },
    { dispatch: false },
  );

  private _saveToLs(plannerState: PlannerState): void {
    this._pfapiService.m.planner.save(plannerState, {
      isUpdateRevAndLastUpdate: true,
    });
  }
}
