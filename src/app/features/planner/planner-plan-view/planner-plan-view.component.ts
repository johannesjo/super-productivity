import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { T } from '../../../t.const';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { PlannerDay, ScheduleItemType } from '../planner.model';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../store/planner.actions';
import { TaskCopy } from '../../tasks/task.model';
import { PlannerPlanViewService } from './planner-plan-view.service';
import { DialogAddTaskReminderComponent } from '../../tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { AddTaskReminderInterface } from '../../tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'planner-plan-view',
  templateUrl: './planner-plan-view.component.html',
  styleUrl: './planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerPlanViewComponent {
  SCHEDULE_ITEM_TYPE = ScheduleItemType;
  // days$: Observable<PlannerDay[]> = of(PLANNER_DUMMY_DATA);

  days$: Observable<PlannerDay[]> = this._plannerPlanViewService.days$;

  protected readonly remindAvailableOptions = TASK_REMINDER_OPTIONS;
  protected readonly T = T;

  constructor(
    private _store: Store,
    private _plannerPlanViewService: PlannerPlanViewService,
    private _matDialog: MatDialog,
  ) {}

  // TODO correct type
  drop(
    targetList: 'TODO' | 'SCHEDULED',
    ev: CdkDragDrop<string, string, TaskCopy>,
  ): void {
    if (targetList === 'SCHEDULED') {
      // TODO show schedule dialog
      return;
    }

    if (ev.previousContainer === ev.container) {
      this._store.dispatch(
        PlannerActions.moveInList({
          targetDay: ev.container.data,
          fromIndex: ev.previousIndex,
          toIndex: ev.currentIndex,
        }),
      );
    } else {
      this._store.dispatch(
        PlannerActions.transferTask({
          task: ev.item.data,
          prevDay: ev.previousContainer.data,
          newDay: ev.container.data,
          targetIndex: ev.currentIndex,
        }),
      );
      // transferArrayItem(
      //   ev.previousContainer.data,
      //   ev.container.data,
      //   ev.previousIndex,
      //   ev.currentIndex,
      // );
      // if (targetList === 'TODO') {
      //   const item = ev.container.data[ev.currentIndex];
      //   if (item.type) {
      //     // TODO remove reminder
      //     ev.container.data[ev.currentIndex] = item.task;
      //   }
      // }
    }
  }

  editTaskReminder(task: TaskCopy): void {
    this._matDialog.open(DialogAddTaskReminderComponent, {
      data: { task } as AddTaskReminderInterface,
    });
  }
}
