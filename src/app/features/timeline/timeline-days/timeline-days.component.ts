import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import {
  TimelineCalendarMapEntry,
  TimelineDay,
  TimelineViewEntry,
} from '../timeline.model';
import { debounceTime, map, tap } from 'rxjs/operators';
import { mapToTimelineViewEntries } from '../map-timeline-data/map-to-timeline-view-entries';
import { getTomorrow } from '../../../util/get-tomorrow';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../dialog-timeline-setup/dialog-timeline-setup.component';
import { Task } from '../../tasks/task.model';
import { DialogAddTaskReminderComponent } from '../../tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { AddTaskReminderInterface } from '../../tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { loadFromRealLs } from '../../../core/persistence/local-storage';
import { TimelineViewEntryType } from '../timeline.const';
import { T } from 'src/app/t.const';
import { mapTimelineEntriesToDays } from '../map-timeline-data/map-timeline-entries-to-days';
import { LayoutService } from '../../../core-ui/layout/layout.service';

@Component({
  selector: 'timeline-days',
  templateUrl: './timeline-days.component.html',
  styleUrl: './timeline-days.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineDaysComponent implements OnDestroy {
  T: typeof T = T;
  TimelineViewEntryType: typeof TimelineViewEntryType = TimelineViewEntryType;

  timelineEntries$: Observable<TimelineViewEntry[]> = combineLatest([
    this._workContextService.timelineTasks$,
    this._taskRepeatCfgService.taskRepeatCfgsWithStartTime$,
    this.taskService.currentTaskId$,
    this._globalConfigService.timelineCfg$,
    this._calendarIntegrationService.icalEvents$,
  ]).pipe(
    debounceTime(50),
    map(([{ planned, unPlanned }, taskRepeatCfgs, currentId, timelineCfg, icalEvents]) =>
      mapToTimelineViewEntries(
        unPlanned,
        planned,
        taskRepeatCfgs,
        icalEvents,
        currentId,
        timelineCfg?.isWorkStartEndEnabled
          ? {
              startTime: timelineCfg.workStart,
              endTime: timelineCfg.workEnd,
            }
          : undefined,
        timelineCfg?.isLunchBreakEnabled
          ? {
              startTime: timelineCfg.lunchBreakStart,
              endTime: timelineCfg.lunchBreakEnd,
            }
          : undefined,
      ),
    ),

    // NOTE: this doesn't require cd.detect changes because view is already re-checked with obs
    tap(() => (this.now = Date.now())),
  );

  timelineDays$: Observable<TimelineDay[]> = this.timelineEntries$.pipe(
    map((entries) => mapTimelineEntriesToDays(entries)),
  );

  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();

  private _moveUpTimeout?: number;
  private _moveDownTimeout?: number;

  constructor(
    public taskService: TaskService,
    public layoutService: LayoutService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _workContextService: WorkContextService,
    private _globalConfigService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _calendarIntegrationService: CalendarIntegrationService,
  ) {
    if (!localStorage.getItem(LS.WAS_TIMELINE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._moveUpTimeout);
    window.clearTimeout(this._moveDownTimeout);
  }

  trackByFn(i: number, item: any): string {
    return item.id;
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

    // if (h && h >= 4.5) return 'xxxl row';
    if (h && h >= 3.5) return 'xxl row';
    if (h && h >= 2.5) return 'xl row';
    if (h && h >= 1.5) return 'l row';
    return 'row';
  }

  async moveUp(task: Task): Promise<void> {
    // if (task.parentId) {
    //   const parentTask = await this.taskService.getByIdOnce$(task.parentId).toPromise();
    //   if (parentTask.subTaskIds[0] === task.id) {
    //     this.taskService.moveUp(task.parentId, undefined, false);
    //     window.clearTimeout(this._moveUpTimeout);
    //     window.setTimeout(() => this.taskService.focusTask(task.id), 50);
    //     return;
    //   }
    // }
    this.taskService.moveUp(task.id, task.parentId, false);
    window.clearTimeout(this._moveUpTimeout);
    window.setTimeout(() => this.taskService.focusTask(task.id), 50);
  }

  async moveDown(task: Task): Promise<void> {
    // if (task.parentId) {
    //   const parentTask = await this.taskService.getByIdOnce$(task.parentId).toPromise();
    //   if (parentTask.subTaskIds[parentTask.subTaskIds.length - 1] === task.id) {
    //     this.taskService.moveDown(task.parentId, undefined, false);
    //     window.clearTimeout(this._moveDownTimeout);
    //     window.setTimeout(() => this.taskService.focusTask(task.id), 50);
    //     return;
    //   }
    // }

    this.taskService.moveDown(task.id, task.parentId, false);
    window.clearTimeout(this._moveDownTimeout);
    window.setTimeout(() => this.taskService.focusTask(task.id), 50);
  }

  editTaskReminder(task: Task): void {
    // NOTE: this also might schedule an unscheduled sub task of a scheduled parent
    this._matDialog.open(DialogAddTaskReminderComponent, {
      data: { task } as AddTaskReminderInterface,
    });
  }

  private _getCalProviderFromCache(): TimelineCalendarMapEntry[] {
    const now = Date.now();
    return (
      ((loadFromRealLs(LS.CAL_EVENTS_CACHE) as TimelineCalendarMapEntry[]) || [])
        // filter out cached past entries
        .map((provider) => ({
          ...provider,
          items: provider.items.filter((item) => item.start + item.duration >= now),
        }))
    );
  }
}
