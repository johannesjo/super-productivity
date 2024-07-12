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
import { DAY_STARTS_AT_DEFAULT_H } from '../../../app.constants';
import { TaskService } from '../../tasks/task.service';
import { ReminderCopy } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { millisecondsDiffToRemindOption } from '../../tasks/util/remind-option-to-milliseconds';

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
    private _taskService: TaskService,
    private _reminderService: ReminderService,
  ) {}

  // TODO correct type
  drop(
    targetList: 'TODO' | 'SCHEDULED',
    ev: CdkDragDrop<string, string, TaskCopy>,
  ): void {
    const newDay = ev.container.data;

    if (targetList === 'SCHEDULED') {
      // TODO show schedule dialog
      if (ev.previousContainer !== ev.container) {
        this.editTaskReminderOrReScheduleIfPossible(ev.item.data, ev.container.data);
      }

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
          newDay: newDay,
          targetIndex: ev.currentIndex,
        }),
      );
      // transferArrayItem(
      //   ev.previousContainer.data,
      //   newDay,
      //   ev.previousIndex,
      //   ev.currentIndex,
      // );
      // if (targetList === 'TODO') {
      //   const item = newDay[ev.currentIndex];
      //   if (item.type) {
      //     // TODO remove reminder
      //     newDay[ev.currentIndex] = item.task;
      //   }
      // }
    }
  }

  editTaskReminderOrReScheduleIfPossible(task: TaskCopy, newDay?: string): void {
    let initialDateTime: number;
    if (newDay) {
      const newDate = new Date(newDay);
      if (task.plannedAt) {
        const taskPlannedAtDate = new Date(task.plannedAt);
        newDate.setHours(
          taskPlannedAtDate.getHours(),
          taskPlannedAtDate.getMinutes(),
          0,
          0,
        );
        const reminder: ReminderCopy | undefined = task.reminderId
          ? this._reminderService.getById(task.reminderId) || undefined
          : undefined;
        const selectedReminderCfgId = millisecondsDiffToRemindOption(
          task.plannedAt as number,
          reminder?.remindAt,
        );
        this._taskService.scheduleTask(task, newDate.getTime(), selectedReminderCfgId);
        return;
      } else {
        newDate.setHours(DAY_STARTS_AT_DEFAULT_H, 0, 0, 0);
      }
      initialDateTime = newDate.getTime();
    }

    this._matDialog.open(DialogAddTaskReminderComponent, {
      data: {
        task,
        // @ts-ignore
        initialDateTime: initialDateTime,
      } as AddTaskReminderInterface,
    });
  }
}
