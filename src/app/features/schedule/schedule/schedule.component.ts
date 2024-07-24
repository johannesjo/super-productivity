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
import { AsyncPipe, NgClass, NgStyle } from '@angular/common';
import { getTimeLeftForViewEntry } from '../../timeline/map-timeline-data/map-to-timeline-view-entries';
import { StuckDirective } from '../../../ui/stuck/stuck.directive';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { ScheduleEvent } from '../schedule.model';
import {
  CdkDrag,
  CdkDragMove,
  CdkDragRelease,
  CdkDragStart,
  CdkDropList,
} from '@angular/cdk/drag-drop';

const FH = 12;
const D_HOURS = 24;
const DRAG_OVER_CLASS = 'drag-over';
const IS_DRAGGING_CLASS = 'is-dragging';

@Component({
  selector: 'schedule',
  standalone: true,
  imports: [
    UiModule,
    NgStyle,
    AsyncPipe,
    NgClass,
    StuckDirective,
    ScheduleEventComponent,
    CdkDrag,
    CdkDropList,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent {
  FH = FH;
  nrOfDaysToShow = 5;
  colByNr = Array.from({ length: this.nrOfDaysToShow }, (_, index) => index);
  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index).filter(
    (v, index) => index % FH === 0,
  );

  // events = [

  times: string[] = this.rowsByNr.map((rowVal, index) => {
    return index.toString() + ':00';
  });

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

  events$: Observable<ScheduleEvent[]> = this.timelineDays$.pipe(
    map((days) => {
      const daysFlat: any[] = [];

      days.forEach((day, dayIndex) => {
        day.entries.forEach((entry, entryIndex) => {
          if (
            entry.type !== TimelineViewEntryType.WorkdayEnd &&
            entry.type !== TimelineViewEntryType.WorkdayStart &&
            entry.type !== TimelineViewEntryType.LunchBreak
          ) {
            const entryAfter = day.entries[entryIndex + 1];
            const start = new Date(entry.start);
            const startHour = start.getHours();
            const startMinute = start.getMinutes();
            // eslint-disable-next-line no-mixed-operators
            const hoursToday = startHour + startMinute / 60;
            const startRow = Math.round(hoursToday * FH);
            const timeLeft =
              entryAfter && entryAfter.type !== TimelineViewEntryType.WorkdayEnd
                ? entryAfter.start - entry.start
                : getTimeLeftForViewEntry(entry);
            const timeLeftInHours = timeLeft / 1000 / 60 / 60;
            const rowSpan = Math.round(timeLeftInHours * FH);
            console.log(startHour, startMinute);
            daysFlat.push({
              title: (entry as any)?.data?.title,
              type: entry.type,
              // title: entry.data.title,
              style: `grid-column: ${dayIndex + 3};  grid-row: ${startRow} / span ${rowSpan}`,
              data: entry.data,
            });
          }
        });
      });
      console.log(daysFlat);

      return daysFlat;
    }),
  );

  currentTimeStyle$ = this.timelineDays$.pipe(
    map((days) => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      // eslint-disable-next-line no-mixed-operators
      const hoursToday = hours + minutes / 60;
      const row = Math.round(hoursToday * FH);
      return `grid-column: ${3};  grid-row: ${row} / span ${1}`;
    }),
  );

  // timelineDays$: Observable<TimelineDay[]> = this.timelineEntries$.pipe(
  //   map((entries) => mapTimelineEntriesToDays(entries)),
  // );

  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();
  isDragging = false;
  containerExtraClass = '';
  prevDragOverEl: HTMLElement | null = null;

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

  dragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    // console.log('dragMoved', ev);
    ev.source.element.nativeElement.style.pointerEvents = 'none';
    const targetEl = document.elementFromPoint(
      ev.pointerPosition.x,
      ev.pointerPosition.y,
    ) as HTMLElement;
    // ev.source.element.nativeElement.style.pointerEvents = '';
    if (!targetEl) {
      return;
    }

    if (targetEl !== this.prevDragOverEl) {
      console.log('dragMoved targetElChanged', targetEl);

      if (this.prevDragOverEl) {
        this.prevDragOverEl.classList.remove(DRAG_OVER_CLASS);
      }
      this.prevDragOverEl = targetEl;
      if (
        targetEl.classList.contains(TimelineViewEntryType.Task) ||
        targetEl.classList.contains(TimelineViewEntryType.SplitTask) ||
        targetEl.classList.contains(TimelineViewEntryType.SplitTaskPlannedForDay) ||
        targetEl.classList.contains(TimelineViewEntryType.TaskPlannedForDay)
      ) {
        this.prevDragOverEl.classList.add(DRAG_OVER_CLASS);
      } else if (targetEl.classList.contains('col')) {
        this.prevDragOverEl.classList.add(DRAG_OVER_CLASS);
      }
    }
  }

  dragStarted(ev: CdkDragStart<ScheduleEvent>): void {
    console.log('dragStart', ev);
    this.isDragging = true;
    this.containerExtraClass = IS_DRAGGING_CLASS + '  ' + ev.source.data.type;
  }

  dragReleased(ev: CdkDragRelease): void {
    console.log('dragReleased', ev);
    ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
    ev.source.element.nativeElement.style.pointerEvents = '';
    ev.source.reset();
    this.isDragging = false;
    this.containerExtraClass = '';
    if (this.prevDragOverEl) {
      this.prevDragOverEl.classList.remove(DRAG_OVER_CLASS);
    }
  }

  private _getDaysToShow(): string[] {
    const nrOfDaysToShow = this.nrOfDaysToShow;
    const today = new Date().getTime();
    const daysToShow: string[] = [];
    for (let i = 0; i < nrOfDaysToShow; i++) {
      // eslint-disable-next-line no-mixed-operators
      daysToShow.push(this._dateService.todayStr(today + i * 24 * 60 * 60 * 1000));
    }
    return daysToShow;
  }

  protected readonly selectTaskRepeatCfgsWithAndWithoutStartTime =
    selectTaskRepeatCfgsWithAndWithoutStartTime;
}
