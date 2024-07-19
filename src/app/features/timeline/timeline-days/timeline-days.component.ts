import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { TimelineDay, TimelineViewEntry } from '../timeline.model';
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
export class TimelineDaysComponent {
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
}
