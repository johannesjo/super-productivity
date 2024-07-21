import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { TimelineDay } from '../timeline.model';
import { debounceTime, map, tap } from 'rxjs/operators';
import { getTomorrow } from '../../../util/get-tomorrow';
import { TaskService } from '../../tasks/task.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../dialog-timeline-setup/dialog-timeline-setup.component';
import { TimelineViewEntryType } from '../timeline.const';
import { T } from 'src/app/t.const';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { select, Store } from '@ngrx/store';
import { selectTimelineTasks } from '../../work-context/store/work-context.selectors';
import { selectPlannerDayMap } from '../../planner/store/planner.selectors';
import { mapToTimelineDays } from '../map-timeline-data/map-to-timeline-days';
import { DateService } from '../../../core/date/date.service';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';

@Component({
  selector: 'timeline-days',
  templateUrl: './timeline-days.component.html',
  styleUrl: './timeline-days.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineDaysComponent {
  T: typeof T = T;
  TimelineViewEntryType: typeof TimelineViewEntryType = TimelineViewEntryType;

  timelineDays$: Observable<TimelineDay[]> = combineLatest([
    this._store.pipe(select(selectTimelineTasks)),
    this._store.pipe(select(selectTaskRepeatCfgsWithAndWithoutStartTime)),
    this.taskService.currentTaskId$,
    this._globalConfigService.timelineCfg$,
    this._calendarIntegrationService.icalEvents$,
    this._store.pipe(select(selectPlannerDayMap)),
  ]).pipe(
    debounceTime(50),
    // debounceTime(1250),
    map(
      ([
        { planned, unPlanned },
        { withStartTime, withoutStartTime },
        currentId,
        timelineCfg,
        icalEvents,
        plannerDayMap,
      ]) =>
        mapToTimelineDays(
          this._getDaysToShow(),
          unPlanned,
          planned,
          withStartTime,
          withoutStartTime,
          icalEvents,
          currentId,
          plannerDayMap,
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

  // timelineDays$: Observable<TimelineDay[]> = this.timelineEntries$.pipe(
  //   map((entries) => mapTimelineEntriesToDays(entries)),
  // );

  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();

  constructor(
    public taskService: TaskService,
    public layoutService: LayoutService,
    private _globalConfigService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _calendarIntegrationService: CalendarIntegrationService,
    private _store: Store,
    private _dateService: DateService,
  ) {
    if (!localStorage.getItem(LS.WAS_TIMELINE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }
  }

  private _getDaysToShow(): string[] {
    const nrOfDaysToShow = 15;
    const today = new Date().getTime();
    const daysToShow: string[] = [];
    for (let i = 0; i < nrOfDaysToShow; i++) {
      // eslint-disable-next-line no-mixed-operators
      daysToShow.push(this._dateService.todayStr(today + i * 24 * 60 * 60 * 1000));
    }
    return daysToShow;
  }
}
