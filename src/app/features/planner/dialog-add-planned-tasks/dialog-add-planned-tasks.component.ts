import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { TaskService } from '../../tasks/task.service';
import { Task } from '../../tasks/task.model';
import { PlannerActions } from '../store/planner.actions';
import { Store } from '@ngrx/store';
import { first, withLatestFrom } from 'rxjs/operators';
import { selectTodayTasksWithPlannedAndDoneSeperated } from '../../work-context/store/work-context.selectors';
import { selectTaskFeatureState } from '../../tasks/store/task.selectors';
import { DateService } from '../../../core/date/date.service';

@Component({
  selector: 'dialog-add-planned-tasks',
  templateUrl: './dialog-add-planned-tasks.component.html',
  styleUrl: './dialog-add-planned-tasks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddPlannedTasksComponent {
  T: typeof T = T;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { missingTasks: Task[] },
    private _matDialogRef: MatDialogRef<DialogAddPlannedTasksComponent>,
    private _taskService: TaskService,
    private _store: Store,
    private _dateService: DateService,
  ) {
    console.log('data', data);
  }

  dismiss(): void {
    this._store
      .select(selectTodayTasksWithPlannedAndDoneSeperated)
      .pipe(withLatestFrom(this._store.select(selectTaskFeatureState)), first())
      .subscribe(([{ planned, done, normal }, taskState]) => {
        this._store.dispatch(
          PlannerActions.upsertPlannerDayTodayAndCleanupOldAndUndefined({
            today: this._dateService.todayStr(),
            taskIdsToAdd: normal.map((task) => task.id),
            allTaskStateIds: taskState.ids as string[],
          }),
        );
        this._close();
      });
  }

  addTasksToToday(): void {
    this.data.missingTasks.forEach((task) => {
      this._taskService.addTodayTag(task);
    });
    this._close();
  }

  private _close(): void {
    this._matDialogRef.close();
  }
}
