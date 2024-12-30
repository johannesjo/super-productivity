import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  LOCALE_ID,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { selectTimelineTasks } from '../../work-context/store/work-context.selectors';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';
import { selectPlannerDayMap } from '../../planner/store/planner.selectors';
import {
  debounceTime,
  delay,
  first,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { getTomorrow } from '../../../util/get-tomorrow';
import { TaskService } from '../../tasks/task.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { DateService } from '../../../core/date/date.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../dialog-timeline-setup/dialog-timeline-setup.component';
import { T } from 'src/app/t.const';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { ScheduleDay, ScheduleEvent } from '../schedule.model';
import {
  CdkDrag,
  CdkDragMove,
  CdkDragRelease,
  CdkDragStart,
} from '@angular/cdk/drag-drop';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { IS_TOUCH_PRIMARY } from 'src/app/util/is-mouse-primary';
import {
  selectTimelineConfig,
  selectTimelineWorkStartEndHours,
} from '../../config/store/global-config.reducer';
import { PlannerActions } from '../../planner/store/planner.actions';
import { FH, SVEType, T_ID_PREFIX } from '../schedule.const';
import { mapToScheduleDays } from '../map-schedule-data/map-to-schedule-days';
import { mapScheduleDaysToScheduleEvents } from '../map-schedule-data/map-schedule-days-to-schedule-events';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { throttle } from 'helpful-decorators';
import { CreateTaskPlaceholderComponent } from '../create-task-placeholder/create-task-placeholder.component';
import { ShortcutService } from '../../../core-ui/shortcut/shortcut.service';
import { DRAG_DELAY_FOR_TOUCH } from '../../../app.constants';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatTooltip } from '@angular/material/tooltip';

// const DAYS_TO_SHOW = 5;
const D_HOURS = 24;
const DRAG_CLONE_CLASS = 'drag-clone';
const DRAG_OVER_CLASS = 'drag-over';
const IS_DRAGGING_CLASS = 'is-dragging';
const IS_NOT_DRAGGING_CLASS = 'is-not-dragging';

@Component({
  selector: 'schedule',
  imports: [
    AsyncPipe,
    ScheduleEventComponent,
    CdkDrag,
    DatePipe,
    CreateTaskPlaceholderComponent,
    MatIcon,
    TranslatePipe,
    MatTooltip,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent implements AfterViewInit, OnDestroy {
  taskService = inject(TaskService);
  layoutService = inject(LayoutService);
  shortcutService = inject(ShortcutService);
  private _matDialog = inject(MatDialog);
  private _calendarIntegrationService = inject(CalendarIntegrationService);
  private _store = inject(Store);
  private _dateService = inject(DateService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _elRef = inject(ElementRef);
  private locale = inject(LOCALE_ID);

  FH = FH;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  DRAG_DELAY_FOR_TOUCH = DRAG_DELAY_FOR_TOUCH;
  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index).filter(
    (v, index) => index % FH === 0,
  );

  // events = [

  is12HourFormat = Intl.DateTimeFormat(this.locale, { hour: 'numeric' }).resolvedOptions()
    .hour12;
  times: string[] = this.rowsByNr.map((rowVal, index) => {
    return this.is12HourFormat
      ? index >= 13
        ? (index - 12).toString() + ':00 PM'
        : index.toString() + ':00 AM'
      : index.toString() + ':00';
  });

  T: typeof T = T;
  SVEType: typeof SVEType = SVEType;

  endOfDayColRowStart: number = D_HOURS * 0.5 * FH;
  currentTimeRow: number = 0;
  totalRows: number = D_HOURS * FH;

  daysToShow$ = this._globalTrackingIntervalService.todayDateStr$.pipe(
    switchMap(() => {
      return fromEvent(window, 'resize').pipe(
        startWith(window.innerWidth),
        debounceTime(50),
        map(() => {
          const width = window.innerWidth;
          if (width < 600) {
            return 3;
          } else if (width < 900) {
            return 4;
          } else if (width < 1900) {
            return 5;
          } else if (width < 2200) {
            return 7;
          } else {
            return 10;
          }
        }),
        map((nrOfDaysToShow) => this._getDaysToShow(nrOfDaysToShow)),
      );
    }),
  );
  daysToShow: string[] = [];

  scheduleDays$: Observable<ScheduleDay[]> = combineLatest([
    this._store.pipe(select(selectTimelineTasks)),
    this._store.pipe(select(selectTaskRepeatCfgsWithAndWithoutStartTime)),
    this._store.pipe(select(selectTimelineConfig)),
    this._calendarIntegrationService.icalEvents$,
    this._store.pipe(select(selectPlannerDayMap)),
    // because typing messes up if there are more than 6
    combineLatest([this.taskService.currentTaskId$, this.daysToShow$]),
  ]).pipe(
    debounceTime(50),
    // debounceTime(1250),
    map(
      ([
        { planned, unPlanned },
        { withStartTime, withoutStartTime },
        timelineCfg,
        icalEvents,
        plannerDayMap,
        [currentId, daysToShow],
      ]) =>
        mapToScheduleDays(
          Date.now(),
          daysToShow,
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
  }> = this.scheduleDays$.pipe(map((days) => mapScheduleDaysToScheduleEvents(days, FH)));

  workStartEnd$ = this._store.pipe(select(selectTimelineWorkStartEndHours)).pipe(
    map((v) => {
      return (
        v && {
          // NOTE: +1 because grids start at 1
          workStartRow: Math.round(FH * v.workStart) + 1,
          workEndRow: Math.round(FH * v.workEnd) + 1,
        }
      );
    }),
  );
  workStartEnd: { workStartRow: number; workEndRow: number } | null = null;

  events$: Observable<ScheduleEvent[]> = this.eventsAndBeyondBudget$.pipe(
    map(({ eventsFlat }) => eventsFlat),
  );
  beyondBudget$: Observable<ScheduleEvent[][]> = this.eventsAndBeyondBudget$.pipe(
    map(({ beyondBudgetDays }) => beyondBudgetDays),
  );

  currentTimeRow$ = this.scheduleDays$.pipe(
    map((days) => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      // eslint-disable-next-line no-mixed-operators
      const hoursToday = hours + minutes / 60;
      const row = Math.round(hoursToday * FH);
      return row;
    }),
  );

  newTaskPlaceholder$ = new BehaviorSubject<{
    style: string;
    time: string;
    date: string;
  } | null>(
    null,
    //   {
    //   style: 'grid-row: 149 / span 4; grid-column: 4 / span 1',
    //   time: '12:00',
    //   date: '11/11/2021',
    // }
  );

  // currentTimeSpan$: Observable<{ from: string; to: string }> = this.daysToShow$.pipe(
  //   map((days) => {
  //     const from = new Date(days[0]);
  //     const to = new Date(days[days.length - 1]);
  //     return {
  //       // from: isToday(from)
  //       //   ? 'Today'
  //       //   : from.toLocaleDateString(this.locale, { day: 'numeric', month: 'numeric' }),
  //       from: from.toLocaleDateString(this.locale, { day: 'numeric', month: 'numeric' }),
  //       to: to.toLocaleDateString(this.locale, { day: 'numeric', month: 'numeric' }),
  //     };
  //   }),
  // );
  // timelineDays$: Observable<ScheduleDay[]> = this.timelineEntries$.pipe(
  //   map((entries) => mapTimelineEntriesToDays(entries)),
  // );

  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();
  isDragging = false;
  isDraggingDelayed = false;
  isCreateTaskActive = false;
  containerExtraClass = IS_NOT_DRAGGING_CLASS;
  prevDragOverEl: HTMLElement | null = null;
  dragCloneEl: HTMLElement | null = null;
  destroyRef = inject(DestroyRef);

  readonly gridContainer = viewChild.required<ElementRef>('gridContainer');

  private _currentAniTimeout: number | undefined;

  constructor() {
    if (!localStorage.getItem(LS.WAS_SCHEDULE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }

    this.daysToShow$.pipe(takeUntilDestroyed()).subscribe((days) => {
      this.daysToShow = days;
      this._elRef.nativeElement.style.setProperty('--nr-of-days', days.length);
    });
    this.workStartEnd$.pipe(takeUntilDestroyed()).subscribe((v) => {
      this.workStartEnd = v;
      this.endOfDayColRowStart = v?.workStartRow || D_HOURS * 0.5 * FH;
    });
    this.currentTimeRow$.pipe(takeUntilDestroyed()).subscribe((v) => {
      this.currentTimeRow = v;
    });
  }

  ngAfterViewInit(): void {
    this.workStartEnd$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        first(),
        delay(400),
        // switchMap((wCfg) => timer(300, 300).pipe(mapTo(wCfg))),
        // take(2),
      )
      .subscribe((workStartCfg) => {
        if (workStartCfg) {
          document
            .querySelector('.work-start')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentAniTimeout);
  }

  onGridClick(ev: MouseEvent): void {
    if (ev.target instanceof HTMLElement && ev.target.classList.contains('col')) {
      this.isCreateTaskActive = true;
    }
  }

  @throttle(30)
  onMoveOverGrid(ev: MouseEvent): void {
    if (this.isDragging || this.isDraggingDelayed) {
      return;
    }
    if (this.isCreateTaskActive) {
      return;
    }

    // console.log(ev);
    if (ev.target instanceof HTMLElement && ev.target.classList.contains('col')) {
      const gridContainer = this.gridContainer().nativeElement;
      const gridStyles = window.getComputedStyle(gridContainer);

      const rowSizes = gridStyles.gridTemplateRows
        .split(' ')
        .map((size) => parseFloat(size));

      let rowIndex = 0;
      let yOffset = ev.offsetY;

      for (let i = 0; i < rowSizes.length; i++) {
        if (yOffset < rowSizes[i]) {
          rowIndex = i + 1;
          break;
        }
        yOffset -= rowSizes[i];
      }

      const targetColRowOffset = +ev.target.style.gridRowStart - 2;
      const targetColColOffset = +ev.target.style.gridColumnStart;
      // console.log(ev.offsetY, targetColRowOffset, targetColColOffset, rowIndex);

      // for mobile, we use blocks of 15 minutes
      // eslint-disable-next-line no-mixed-operators
      const targetRow = IS_TOUCH_PRIMARY ? Math.floor(rowIndex / 3) * 3 - 1 : rowIndex;
      const row = targetRow + targetColRowOffset;
      const hours = Math.floor((row - 1) / FH);
      const minutes = Math.floor(((row - 1) % FH) * (60 / FH));
      const time = `${hours}:${minutes.toString().padStart(2, '0')}`;

      this.newTaskPlaceholder$.next({
        style: `grid-row: ${row} / span 6; grid-column: ${targetColColOffset} / span 1`,
        time,
        date: this.daysToShow[targetColColOffset - 2],
      });
    } else {
      this.newTaskPlaceholder$.next(null);
    }
  }

  @throttle(30)
  dragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    // sometimes drag move fires after drag release, leaving elements in a drag over state, if we don't do this
    if (!this.isDragging) {
      return;
    }

    // console.log('dragMoved', ev);
    ev.source.element.nativeElement.style.pointerEvents = 'none';
    const targetEl = document.elementFromPoint(
      ev.pointerPosition.x,
      ev.pointerPosition.y,
    ) as HTMLElement;
    if (!targetEl) {
      return;
    }
    // the clone element should be ignored for drag over class
    if (targetEl.classList.contains(DRAG_CLONE_CLASS)) {
      return;
    }
    // console.log(targetEl.id, targetEl);

    if (targetEl !== this.prevDragOverEl) {
      console.log('dragMoved targetElChanged', targetEl);

      if (this.prevDragOverEl) {
        this.prevDragOverEl.classList.remove(DRAG_OVER_CLASS);
      }
      this.prevDragOverEl = targetEl;

      if (
        targetEl.classList.contains(SVEType.Task) ||
        targetEl.classList.contains(SVEType.SplitTask) ||
        targetEl.classList.contains(SVEType.SplitTaskPlannedForDay) ||
        targetEl.classList.contains(SVEType.TaskPlannedForDay)
      ) {
        targetEl.classList.add(DRAG_OVER_CLASS);
      } else if (targetEl.classList.contains('col')) {
        targetEl.classList.add(DRAG_OVER_CLASS);
      }
    }
  }

  dragStarted(ev: CdkDragStart<ScheduleEvent>): void {
    console.log('dragStart', ev);
    this.isDragging = this.isDraggingDelayed = true;
    this.containerExtraClass = IS_DRAGGING_CLASS + '  ' + ev.source.data.type;

    const cur = ev.source.element.nativeElement;
    if (this.dragCloneEl) {
      this.dragCloneEl.remove();
    }
    this.dragCloneEl = cur.cloneNode(true) as HTMLElement;
    this.dragCloneEl.style.transform = 'translateY(0)';
    this.dragCloneEl.style.opacity = '.1';
    // NOTE: used to avoid interfering with  the drag over class
    this.dragCloneEl.classList.add(DRAG_CLONE_CLASS);
    // this.dragCloneEl.style.pointerEvents = 'none';
    cur.parentNode?.insertBefore(this.dragCloneEl, cur);
  }

  dragReleased(ev: CdkDragRelease): void {
    console.log('dragReleased', {
      target: ev.event.target,
      source: ev.source.element.nativeElement,
      ev,
      dragOverEl: this.prevDragOverEl,
    });

    // for very short drags prevDragOverEl is undefined. For desktop only the event.target can be used instead
    const target = (this.prevDragOverEl || ev.event.target) as HTMLElement;
    if (this.prevDragOverEl) {
      this.prevDragOverEl.classList.remove(DRAG_OVER_CLASS);
      this.prevDragOverEl = null;
    }
    if (this.dragCloneEl) {
      this.dragCloneEl.remove();
    }

    this.isDragging = false;
    ev.source.element.nativeElement.style.pointerEvents = '';
    ev.source.element.nativeElement.style.opacity = '0';

    setTimeout(() => {
      if (ev.source.element?.nativeElement?.style) {
        ev.source.element.nativeElement.style.opacity = '';
        // NOTE: doing this again fixes the issue that the element remains in the wrong state sometimes
        ev.source.element.nativeElement.style.pointerEvents = '';
      }
      this.isDraggingDelayed = false;
    }, 100);

    this.containerExtraClass = IS_NOT_DRAGGING_CLASS;

    if (target.tagName.toLowerCase() === 'div' && target.classList.contains('col')) {
      const isMoveToEndOfDay = target.classList.contains('end-of-day');
      const targetDay = (target as any).day || target.getAttribute('data-day');
      console.log({ targetDay });
      if (targetDay) {
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: ev.source.data.data,
            day: targetDay,
            isAddToTop: !isMoveToEndOfDay,
          }),
        );

        // this._aniMoveToItem(ev.source.element.nativeElement, () => ev.source.reset());
        // return;
      }
    } else if (target.tagName.toLowerCase() === 'schedule-event') {
      // const sourceTaskId = ev.source.data.data.id;
      const sourceTaskId = ev.source.element.nativeElement.id.replace(T_ID_PREFIX, '');
      const targetTaskId = target.id.replace(T_ID_PREFIX, '');
      console.log(sourceTaskId === targetTaskId, sourceTaskId, targetTaskId);

      if (
        sourceTaskId &&
        sourceTaskId.length > 0 &&
        targetTaskId &&
        sourceTaskId !== targetTaskId
      ) {
        console.log('sourceTaskId', sourceTaskId, 'targetTaskId', targetTaskId);
        this._store.dispatch(
          PlannerActions.moveBeforeTask({
            fromTask: ev.source.data.data,
            toTaskId: targetTaskId,
          }),
        );
        // ev.source.element.nativeElement.style.opacity = '0';
        // ev.source.element.nativeElement.style.transition = 'none';
        // ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
        // ev.source.element.nativeElement.style.transition = '';
        //
        // setTimeout(() => {
        //   ev.source.element.nativeElement.style.opacity = '';
        // });
      }
    }

    ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
    ev.source.reset();
  }

  private _aniMoveToItem(targetEl: HTMLElement, resetFn: () => void): void {
    // targetEl.style.opacity = '0';
    targetEl.style.transition = 'none';
    targetEl.style.transform = this._replaceFirstNumberInTranslate3d(
      targetEl.style.transform,
      0,
    );

    this._currentAniTimeout = window.setTimeout(() => {
      targetEl.style.opacity = '';
      targetEl.style.transition = '';
      targetEl.style.transform = 'translate3d(0, 0, 0)';

      resetFn();
    }, 100);
  }

  private _getDaysToShow(nrOfDaysToShow: number): string[] {
    const today = new Date().getTime();
    const daysToShow: string[] = [];
    for (let i = 0; i < nrOfDaysToShow; i++) {
      // eslint-disable-next-line no-mixed-operators
      daysToShow.push(this._dateService.todayStr(today + i * 24 * 60 * 60 * 1000));
    }
    return daysToShow;
  }

  private _replaceFirstNumberInTranslate3d(input: string, newNumber: number): string {
    const parts = input.split(',');
    parts[0] = `translate3d(${newNumber}`;
    return parts.join(',');
  }
}
