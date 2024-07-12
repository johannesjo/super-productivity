import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { TaskService } from '../../tasks/task.service';
import { Task } from '../../tasks/task.model';
import { PlannerPlanViewService } from '../planner-plan-view/planner-plan-view.service';
import { PlannerActions } from '../store/planner.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { Store } from '@ngrx/store';
import { first, withLatestFrom } from 'rxjs/operators';
import { selectTodayTasksWithPlannedAndDoneSeperated } from '../../work-context/store/work-context.selectors';
import { selectTaskFeatureState } from '../../tasks/store/task.selectors';

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
    private _plannerPlanViewService: PlannerPlanViewService,
    private _store: Store,
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
            today: getWorklogStr(),
            taskIds: normal.map((task) => task.id),
            allTaskIds: taskState.ids as string[],
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
