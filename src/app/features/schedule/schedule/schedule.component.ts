import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiModule } from '../../../ui/ui.module';
import { combineLatest, Observable } from 'rxjs';
import { TimelineDay } from '../../timeline/timeline.model';
import { select, Store } from '@ngrx/store';
import { selectTimelineTasks } from '../../work-context/store/work-context.selectors';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';
import { selectPlannerDayMap } from '../../planner/store/planner.selectors';
import { debounceTime, map, tap } from 'rxjs/operators';
import { mapToTimelineDays } from '../../timeline/map-timeline-data/map-to-timeline-days';
import { getTomorrow } from '../../../util/get-tomorrow';
import { TaskService } from '../../tasks/task.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { DateService } from '../../../core/date/date.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../../timeline/dialog-timeline-setup/dialog-timeline-setup.component';
import { T } from 'src/app/t.const';
import { TimelineViewEntryType } from '../../timeline/timeline.const';
import { NgStyle } from '@angular/common';

const FH = 12;
const D_HOURS = 24;

@Component({
  selector: 'schedule',
  standalone: true,
  imports: [UiModule, NgStyle],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent {
  FH = FH;
  daysToShow = 7;
  colByNr = Array.from({ length: this.daysToShow }, (_, index) => index);
  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index);

  times: string[] = this.rowsByNr.map((_, index) => {
    if (index % FH === 0) {
      return (index / FH).toString() + ':00';
    } else {
      // eslint-disable-next-line no-mixed-operators
      // return '  :' + (index % FH) * 5;
      return '';
    }
  });

  events = [
    {
      title: 'Something',
      style: 'grid-column: 5;  grid-row: 10 / span 6',
    },
    {
      title: 'Something Else',
      style: 'grid-column: 6;  grid-row: 10 / span 12',
    },
  ];

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
