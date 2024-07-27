import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { DateService } from '../../../core/date/date.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../../timeline/dialog-timeline-setup/dialog-timeline-setup.component';
import { T } from 'src/app/t.const';
import { TimelineViewEntryType } from '../../timeline/timeline.const';
import { AsyncPipe, DatePipe, NgClass, NgIf, NgStyle } from '@angular/common';
import { getDurationForViewEntry } from '../../timeline/map-timeline-data/map-to-timeline-view-entries';
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
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { IS_TOUCH_PRIMARY } from 'src/app/util/is-mouse-primary';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import {
  selectTimelineConfig,
  selectTimelineWorkStartEndHours,
} from '../../config/store/global-config.reducer';
import { PlannerActions } from '../../planner/store/planner.actions';

const DAYS_TO_SHOW = 5;
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
    DatePipe,
    NgIf,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent implements AfterViewInit, OnDestroy {
  FH = FH;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index).filter(
    (v, index) => index % FH === 0,
  );

  // events = [

  times: string[] = this.rowsByNr.map((rowVal, index) => {
    return index.toString() + ':00';
  });

  T: typeof T = T;
  TimelineViewEntryType: typeof TimelineViewEntryType = TimelineViewEntryType;

  daysToShow$ = this._globalTrackingIntervalService.todayDateStr$.pipe(
    map(() => {
      return this._getDaysToShow();
    }),
  );

  timelineDays$: Observable<TimelineDay[]> = combineLatest([
    this._store.pipe(select(selectTimelineTasks)),
    this._store.pipe(select(selectTaskRepeatCfgsWithAndWithoutStartTime)),
    this.taskService.currentTaskId$,
    this._store.pipe(select(selectTimelineConfig)),
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

  eventsAndBeyondBudget$: Observable<{
    eventsFlat: ScheduleEvent[];
    beyondBudgetDays: ScheduleEvent[][];
  }> = this.timelineDays$.pipe(
    map((days) => {
      const eventsFlat: ScheduleEvent[] = [];
      const beyondBudgetDays: ScheduleEvent[][] = [];

      days.forEach((day, dayIndex) => {
        beyondBudgetDays[dayIndex] = day.beyondBudgetTasks.map((taskPlannedForDay) => {
          // eslint-disable-next-line no-mixed-operators
          const timeLeft = getTimeLeftForTask(taskPlannedForDay);
          const timeLeftInHours = timeLeft / 1000 / 60 / 60;
          const rowSpan = Math.round(timeLeftInHours * FH);
          return {
            id: taskPlannedForDay.id,
            data: taskPlannedForDay,
            title: taskPlannedForDay.title,
            type: TimelineViewEntryType.TaskPlannedForDay,
            style: `height: ${rowSpan * 8}px`,
          };
        });

        day.entries.forEach((entry, entryIndex) => {
          if (
            entry.type !== TimelineViewEntryType.WorkdayEnd &&
            entry.type !== TimelineViewEntryType.WorkdayStart
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
                : getDurationForViewEntry(entry);
            const timeLeftInHours = timeLeft / 1000 / 60 / 60;
            const rowSpan = Math.round(timeLeftInHours * FH);
            eventsFlat.push({
              title:
                (entry as any)?.data?.title ||
                (entry.type === TimelineViewEntryType.LunchBreak
                  ? 'Lunch Break'
                  : 'TITLE'),
              id: (entry.data as any)?.id || entry.id,
              type: entry.type,
              // title: entry.data.title,
              style: `grid-column: ${dayIndex + 2};  grid-row: ${startRow} / span ${rowSpan}`,
              data: entry.data,
            });
          }
        });
      });
      console.log(eventsFlat);

      return { eventsFlat, beyondBudgetDays };
    }),
  );

  workStartEnd$ = this._store.pipe(select(selectTimelineWorkStartEndHours)).pipe(
    map((v) => {
      return (
        v && {
          workStartRow: Math.round(FH * v.workStart),
          workEndRow: Math.round(FH * v.workEnd),
        }
      );
    }),
  );

  events$: Observable<ScheduleEvent[]> = this.eventsAndBeyondBudget$.pipe(
    map(({ eventsFlat }) => eventsFlat),
  );
  beyondBudget$: Observable<ScheduleEvent[][]> = this.eventsAndBeyondBudget$.pipe(
    map(({ beyondBudgetDays }) => beyondBudgetDays),
  );

  currentTimeStyle$ = this.timelineDays$.pipe(
    map((days) => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      // eslint-disable-next-line no-mixed-operators
      const hoursToday = hours + minutes / 60;
      const row = Math.round(hoursToday * FH);
      return `grid-column: ${2};  grid-row: ${row} / span ${1}`;
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
  @ViewChild('gridContainer') gridContainer!: ElementRef;

  private _scrollTopFirstElTimeout: number | undefined;

  constructor(
    public taskService: TaskService,
    public layoutService: LayoutService,
    private _matDialog: MatDialog,
    private _calendarIntegrationService: CalendarIntegrationService,
    private _store: Store,
    private _dateService: DateService,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
  ) {
    if (!localStorage.getItem(LS.WAS_TIMELINE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }
  }

  ngAfterViewInit(): void {
    this._scrollTopFirstElTimeout = window.setTimeout(() => {
      this.scrollToTopElement();
    }, 400);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._scrollTopFirstElTimeout);
  }

  scrollToTopElement(): void {
    const container: HTMLElement = this.gridContainer.nativeElement;
    let topElement: HTMLElement | null = null;
    let minOffsetTop = Number.MAX_SAFE_INTEGER;

    for (const child of Array.from(container.children)) {
      const childEl = child as HTMLElement;
      if (
        childEl.tagName.toLowerCase() === 'schedule-event' &&
        childEl.offsetTop < minOffsetTop
      ) {
        minOffsetTop = childEl.offsetTop;
        topElement = childEl;
      }
    }

    topElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      } else if (targetEl.classList.contains('dropzones')) {
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
    console.log('dragReleased', {
      target: ev.event.target,
      source: ev.source.element.nativeElement,
      ev,
    });

    ev.source.element.nativeElement.style.pointerEvents = '';
    this.isDragging = false;
    this.containerExtraClass = '';
    if (this.prevDragOverEl) {
      this.prevDragOverEl.classList.remove(DRAG_OVER_CLASS);
    }
    const target = ev.event.target as HTMLElement;
    if (
      target.tagName.toLowerCase() === 'div' &&
      target.classList.contains('dropzones')
    ) {
      const targetDay = (target as any).day || target.getAttribute('data-day');
      console.log(targetDay);
      if (targetDay) {
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: ev.source.data.data,
            day: targetDay,
          }),
        );
      }
    } else if (target.tagName.toLowerCase() === 'schedule-event') {
      // const sourceTaskId = ev.source.data.data.id;
      const sourceTaskId = ev.source.element.nativeElement.id.replace('t-', '');
      const targetTaskId = target.id.replace('t-', '');
      if (sourceTaskId && targetTaskId && sourceTaskId !== targetTaskId) {
        console.log('sourceTaskId', sourceTaskId, 'targetTaskId', targetTaskId);
        console.log('DISPATCH');
        this._store.dispatch(
          PlannerActions.moveBeforeTask({
            fromTask: ev.source.data.data,
            toTaskId: targetTaskId,
          }),
        );
        ev.source.element.nativeElement.style.opacity = '0';
        ev.source.element.nativeElement.style.transition = 'none';
        ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
        ev.source.element.nativeElement.style.transition = '';

        setTimeout(() => {
          ev.source.element.nativeElement.style.opacity = '';
        });
      }
    }
    ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
    ev.source.reset();
  }

  private _getDaysToShow(): string[] {
    const nrOfDaysToShow = DAYS_TO_SHOW;
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
