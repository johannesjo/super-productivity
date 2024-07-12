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
import { TODAY_TAG } from '../../tag/tag.const';

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
    const task = ev.item.data;

    if (targetList === 'SCHEDULED') {
      // TODO show schedule dialog
      if (ev.previousContainer !== ev.container) {
        this.editTaskReminderOrReScheduleIfPossible(task, ev.container.data);
      }
      return;
    } else if (targetList === 'TODO') {
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
            task: task,
            prevDay: ev.previousContainer.data,
            newDay: newDay,
            targetIndex: ev.currentIndex,
          }),
        );
        if (task.reminderId) {
          this._taskService.unScheduleTask(task.id, task.reminderId);
        }
      }
    }
  }

  editTaskReminderOrReScheduleIfPossible(task: TaskCopy, newDay?: string): void {
    let initialDateTime: number;
    if (newDay) {
      const newDate = new Date(newDay);
      if (task.plannedAt) {
        this._rescheduleTask(task, newDate);
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

  private _rescheduleTask(task: TaskCopy, newDate: Date): void {
    const taskPlannedAtDate = new Date(task.plannedAt as number);
    newDate.setHours(taskPlannedAtDate.getHours(), taskPlannedAtDate.getMinutes(), 0, 0);
    const reminder: ReminderCopy | undefined = task.reminderId
      ? this._reminderService.getById(task.reminderId) || undefined
      : undefined;
    const selectedReminderCfgId = millisecondsDiffToRemindOption(
      task.plannedAt as number,
      reminder?.remindAt,
    );
    const isToday = new Date().toDateString() === newDate.toDateString();
    this._taskService.scheduleTask(task, newDate.getTime(), selectedReminderCfgId, false);
    if (isToday) {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds], task.tagIds);
    } else {
      this._taskService.updateTags(
        task,
        task.tagIds.filter((tid) => tid !== TODAY_TAG.id),
        task.tagIds,
      );
    }
  }
}
