import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { PlannerActions } from '../store/planner.actions';
import { select, Store } from '@ngrx/store';
import { first, map, switchMap, withLatestFrom } from 'rxjs/operators';
import {
  selectTodayTaskIds,
  selectTodayTasksWithPlannedAndDoneSeperated,
} from '../../work-context/store/work-context.selectors';
import {
  selectTaskFeatureState,
  selectTasksById,
} from '../../tasks/store/task.selectors';
import { DateService } from '../../../core/date/date.service';
import { PlannerService } from '../planner.service';
import { combineLatest } from 'rxjs';
import { getAllMissingPlannedTaskIdsForDay } from '../util/get-all-missing-planned-task-ids-for-day';
import { TODAY_TAG } from '../../tag/tag.const';
import { updateTaskTags } from '../../tasks/store/task.actions';

@Component({
  selector: 'dialog-add-planned-tasks',
  templateUrl: './dialog-add-planned-tasks.component.html',
  styleUrl: './dialog-add-planned-tasks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddPlannedTasksComponent {
  T: typeof T = T;
  day$ = this._plannerService.days$.pipe(
    map((days) => {
      const todayStr = this._dateService.todayStr();
      const day = days.find((d) => d.dayDate === todayStr);
      if (!day) {
        throw new Error('Planner Day not found');
      }
      return day;
    }),
  );

  private _missingTakIds$ = combineLatest(
    this.day$,
    this._store.pipe(select(selectTodayTaskIds)),
  ).pipe(
    map(([day, todayTaskIds]) => getAllMissingPlannedTaskIdsForDay(day, todayTaskIds)),
  );

  private _missingTasks$ = this._missingTakIds$.pipe(
    switchMap((taskIds) => {
      return this._store.select(selectTasksById, { ids: taskIds });
    }),
    // filter out missing tasks (e.g. deleted or archived)
    map((tasks) => tasks.filter((task) => !!task)),
  );

  constructor(
    private _matDialogRef: MatDialogRef<DialogAddPlannedTasksComponent>,
    private _plannerService: PlannerService,
    private _store: Store,
    private _dateService: DateService,
  ) {
    // prevent close since it does not reappear
    _matDialogRef.disableClose = true;
  }

  dismiss(): void {
    this._store
      .select(selectTodayTasksWithPlannedAndDoneSeperated)
      .pipe(withLatestFrom(this._store.select(selectTaskFeatureState)), first())
      .subscribe(([{ planned, done, normal }, taskState]) => {
        this._store.dispatch(
          PlannerActions.cleanupOldAndUndefinedPlannerTasks({
            today: this._dateService.todayStr(),
            allTaskIds: taskState.ids as string[],
          }),
        );
        this._close();
      });
  }

  async addTasksToToday(): Promise<void> {
    const missingTasks = await this._missingTasks$.pipe(first()).toPromise();
    missingTasks.reverse().forEach((task) => {
      this._store.dispatch(
        updateTaskTags({ task, newTagIds: [TODAY_TAG.id, ...task.tagIds] }),
      );
    });
    this._close();
  }

  private _close(): void {
    this._matDialogRef.close();
  }
}
