import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { T } from '../../../t.const';
import { PlannerDay, ScheduleItem, ScheduleItemType } from '../planner.model';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';
import { PlannerActions } from '../store/planner.actions';
import { DAY_STARTS_AT_DEFAULT_H } from '../../../app.constants';
import { DialogAddTaskReminderComponent } from '../../tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { AddTaskReminderInterface } from '../../tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { ReminderCopy } from '../../reminder/reminder.model';
import { millisecondsDiffToRemindOption } from '../../tasks/util/remind-option-to-milliseconds';
import { TODAY_TAG } from '../../tag/tag.const';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { ReminderService } from '../../reminder/reminder.service';
import { moveTaskInTagList } from '../../tag/store/tag.actions';
import { DateService } from '../../../core/date/date.service';

@Component({
  selector: 'planner-day',
  templateUrl: './planner-day.component.html',
  styleUrl: './planner-day.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerDayComponent {
  @Input() day!: PlannerDay;

  protected readonly T = T;
  protected readonly SCHEDULE_ITEM_TYPE = ScheduleItemType;

  constructor(
    private _store: Store,
    private _matDialog: MatDialog,
    private _taskService: TaskService,
    private _reminderService: ReminderService,
    private _dateService: DateService,
  ) {}

  // TODO correct type
  drop(
    targetList: 'TODO' | 'SCHEDULED',
    allItems: TaskCopy[] | ScheduleItem[],
    ev: CdkDragDrop<string, string, TaskCopy>,
  ): void {
    const newDay = ev.container.data;
    const task = ev.item.data;

    if (targetList === 'SCHEDULED') {
      if (ev.previousContainer !== ev.container) {
        this.editTaskReminderOrReScheduleIfPossible(task, ev.container.data);
      }
      return;
    } else if (targetList === 'TODO') {
      if (ev.previousContainer === ev.container) {
        if (this.day.isToday) {
          this._store.dispatch(
            moveTaskInTagList({
              tagId: TODAY_TAG.id,
              fromTaskId: task.id,
              toTaskId: allItems[ev.currentIndex].id,
            }),
          );
        } else {
          this._store.dispatch(
            PlannerActions.moveInList({
              targetDay: ev.container.data,
              fromIndex: ev.previousIndex,
              toIndex: ev.currentIndex,
            }),
          );
        }
      } else {
        this._store.dispatch(
          PlannerActions.transferTask({
            task: task,
            prevDay: ev.previousContainer.data,
            newDay: newDay,
            targetIndex: ev.currentIndex,
            today: this._dateService.todayStr(),
            targetTaskId: allItems[ev.currentIndex]?.id,
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
      if (task.plannedAt && task.reminderId) {
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
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds]);
    } else {
      this._taskService.updateTags(
        task,
        task.tagIds.filter((tid) => tid !== TODAY_TAG.id),
      );
    }
  }
}
