import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { T } from '../../../t.const';
import { PlannerDay, ScheduleItem, ScheduleItemType } from '../planner.model';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';
import { PlannerActions } from '../store/planner.actions';
import { DAY_STARTS_AT_DEFAULT_H } from '../../../app.constants';
import { ReminderCopy } from '../../reminder/reminder.model';
import { millisecondsDiffToRemindOption } from '../../tasks/util/remind-option-to-milliseconds';
import { TODAY_TAG } from '../../tag/tag.const';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { ReminderService } from '../../reminder/reminder.service';
import { moveTaskInTagList } from '../../tag/store/tag.actions';
import { DateService } from '../../../core/date/date.service';
import { DialogScheduleTaskComponent } from '../dialog-schedule-task/dialog-schedule-task.component';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { MatIcon } from '@angular/material/icon';
import { PlannerTaskComponent } from '../planner-task/planner-task.component';
import { PlannerRepeatProjectionComponent } from '../planner-repeat-projection/planner-repeat-projection.component';
import { AddTaskInlineComponent } from '../add-task-inline/add-task-inline.component';
import { DatePipe, NgClass } from '@angular/common';
import { PlannerCalendarEventComponent } from '../planner-calendar-event/planner-calendar-event.component';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { RoundDurationPipe } from '../../../ui/pipes/round-duration.pipe';
import { ShortTime2Pipe } from '../../../ui/pipes/short-time2.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { ShortDate2Pipe } from '../../../ui/pipes/short-date2.pipe';

@Component({
  selector: 'planner-day',
  templateUrl: './planner-day.component.html',
  styleUrl: './planner-day.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    CdkDropList,
    PlannerTaskComponent,
    CdkDrag,
    PlannerRepeatProjectionComponent,
    AddTaskInlineComponent,
    NgClass,
    PlannerCalendarEventComponent,
    DatePipe,
    MsToStringPipe,
    RoundDurationPipe,
    ShortTime2Pipe,
    TranslatePipe,
    ShortDate2Pipe,
  ],
})
export class PlannerDayComponent {
  private _store = inject(Store);
  private _matDialog = inject(MatDialog);
  private _taskService = inject(TaskService);
  private _reminderService = inject(ReminderService);
  private _dateService = inject(DateService);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() day!: PlannerDay;

  protected readonly T = T;
  protected readonly SCHEDULE_ITEM_TYPE = ScheduleItemType;

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
          // NOTE: we need to wait a bit to make sure the task is already moved into the proper position
          // as otherwise unschedule will mess up the order
          setTimeout(() => {
            this._taskService.unScheduleTask(task.id, task.reminderId as string);
          });
        }
      }
    }
  }

  editTaskReminderOrReScheduleIfPossible(task: TaskCopy, newDay?: string): void {
    if (newDay) {
      const newDate = dateStrToUtcDate(newDay);
      if (task.plannedAt && task.reminderId) {
        this._rescheduleTask(task, newDate);
        return;
      } else {
        newDate.setHours(DAY_STARTS_AT_DEFAULT_H, 0, 0, 0);
      }
    }

    this._matDialog.open(DialogScheduleTaskComponent, {
      data: {
        task,
        targetDay: newDay,
      },
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
