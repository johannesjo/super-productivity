import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TimelineDay, TimelineViewEntry } from '../timeline.model';
import { T } from '../../../t.const';
import { TimelineViewEntryType } from '../timeline.const';
import { getTomorrow } from '../../../util/get-tomorrow';
import { Task } from '../../tasks/task.model';
import { DialogAddTaskReminderComponent } from '../../tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { AddTaskReminderInterface } from '../../tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { TaskService } from '../../tasks/task.service';
import { MatDialog } from '@angular/material/dialog';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../dialog-timeline-setup/dialog-timeline-setup.component';

@Component({
  selector: 'timeline-day',
  templateUrl: './timeline-day.component.html',
  styleUrl: './timeline-day.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineDayComponent {
  @Input({ required: true }) timelineDay!: TimelineDay;
  protected readonly T = T;
  protected readonly TimelineViewEntryType = TimelineViewEntryType;

  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();
  currentTaskId: string | null = null;

  constructor(
    public taskService: TaskService,
    private _matDialog: MatDialog,
  ) {
    if (!localStorage.getItem(LS.WAS_TIMELINE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }
  }

  getSizeClass(timelineEntry: TimelineViewEntry): string {
    // TODO fix that this is being reRendered on every hover
    const d =
      // @ts-ignore
      timelineEntry?.data?.timeEstimate ||
      // @ts-ignore
      timelineEntry?.data?.timeToGo ||
      // @ts-ignore
      timelineEntry?.data?.defaultEstimate;
    const h = d && d / 60 / 60 / 1000;

    if (h && h >= 4.5) return 'xxxl row';
    if (h && h >= 3.5) return 'xxl row';
    if (h && h >= 2.5) return 'xl row';
    if (h && h >= 1.5) return 'l row';
    return 'row';
  }

  async moveUp(task: Task): Promise<void> {
    this.taskService.moveUp(task.id, task.parentId, false);
  }

  async moveDown(task: Task): Promise<void> {
    this.taskService.moveDown(task.id, task.parentId, false);
  }

  editTaskReminder(task: Task): void {
    // NOTE: this also might schedule an unscheduled sub task of a scheduled parent
    this._matDialog.open(DialogAddTaskReminderComponent, {
      data: { task } as AddTaskReminderInterface,
    });
  }
}
