import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ScheduleWeekComponent } from '../schedule-week/schedule-week.component';
import { DateService } from '../../../core/date/date.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectTimelineTasks } from '../../work-context/store/work-context.selectors';
import { selectPlannerDayMap } from '../../planner/store/planner.selectors';
import { selectTaskRepeatCfgsWithAndWithoutStartTime } from '../../task-repeat-cfg/store/task-repeat-cfg.selectors';
import {
  selectTimelineConfig,
  selectTimelineWorkStartEndHours,
} from '../../config/store/global-config.reducer';
import { CalendarIntegrationService } from '../../calendar-integration/calendar-integration.service';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { mapToScheduleDays } from '../map-schedule-data/map-to-schedule-days';
import { mapScheduleDaysToScheduleEvents } from '../map-schedule-data/map-schedule-days-to-schedule-events';
import { FH } from '../schedule.const';
import { calculateTimeFromYPosition } from '../schedule-utils';
import { CdkDrag, CdkDragDrop, CdkDragEnter, CdkDropList } from '@angular/cdk/drag-drop';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';
import { PlannerActions } from '../../planner/store/planner.actions';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { Log } from '../../../core/log';

const DEFAULT_MIN_DURATION = 15 * 60 * 1000;

@Component({
  selector: 'schedule-day-panel',
  standalone: true,
  imports: [ScheduleWeekComponent, CdkDropList],
  styleUrl: './schedule-day-panel.component.scss',
  templateUrl: './schedule-day-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleDayPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scheduleWeek', { read: ElementRef }) scheduleWeekRef!: ElementRef;
  @ViewChild('dropList') dropList!: CdkDropList;

  private _store = inject(Store);
  private _dateService = inject(DateService);
  private _calendarIntegrationService = inject(CalendarIntegrationService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _dropListService = inject(DropListService);
  private _cdr = inject(ChangeDetectorRef);
  private _ngZone = inject(NgZone);

  // Drag preview properties
  dragPreviewTime = signal<string | null>(null);
  isDragging = signal(false);
  private lastCalculatedTimestamp: number | null = null;

  private _todayDateStr = toSignal(this._globalTrackingIntervalService.todayDateStr$, {
    initialValue: this._dateService.todayStr(Date.now()),
  });

  daysToShow = computed(() => {
    const d = this._todayDateStr();
    return d ? [d] : [];
  });

  private _timelineTasks = toSignal(this._store.select(selectTimelineTasks));
  private _taskRepeatCfgs = toSignal(
    this._store.select(selectTaskRepeatCfgsWithAndWithoutStartTime),
  );
  private _timelineConfig = toSignal(this._store.select(selectTimelineConfig));
  private _icalEvents = toSignal(this._calendarIntegrationService.icalEvents$, {
    initialValue: [],
  });
  private _plannerDayMap = toSignal(this._store.select(selectPlannerDayMap));

  scheduleDays = computed(() => {
    const timelineTasks = this._timelineTasks();
    const taskRepeatCfgs = this._taskRepeatCfgs();
    const timelineCfg = this._timelineConfig();
    const icalEvents = this._icalEvents();
    const plannerDayMap = this._plannerDayMap();
    const daysToShow = this.daysToShow();

    if (!timelineTasks || !taskRepeatCfgs || !plannerDayMap) {
      return [];
    }

    return mapToScheduleDays(
      Date.now(),
      daysToShow,
      timelineTasks.unPlanned,
      timelineTasks.planned,
      taskRepeatCfgs.withStartTime,
      taskRepeatCfgs.withoutStartTime,
      icalEvents,
      null,
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
    );
  });

  private _eventsAndBeyondBudget = computed(() => {
    const days = this.scheduleDays();
    return mapScheduleDaysToScheduleEvents(days, FH);
  });

  events = computed(() => this._eventsAndBeyondBudget().eventsFlat);

  private _workStartEndHours = toSignal(
    this._store.select(selectTimelineWorkStartEndHours),
  );

  workStartEnd = computed(() => {
    const v = this._workStartEndHours();
    return (
      v && {
        workStartRow: Math.round(FH * v.workStart) + 1,
        workEndRow: Math.round(FH * v.workEnd) + 1,
      }
    );
  });

  currentTimeRow = computed(() => {
    // Trigger re-computation via today change
    this._todayDateStr();
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // eslint-disable-next-line no-mixed-operators
    const hoursToday = hours + minutes / 60;
    return Math.round(hoursToday * FH);
  });

  // Effect to scroll to current time when the component initializes or current time changes
  constructor() {
    effect(() => {
      // Track current time row changes to trigger auto-scroll
      this.currentTimeRow();
      // Delay the scroll to ensure the DOM is ready
      setTimeout(() => {
        this._scrollToCurrentTime();
      }, 100);
    });
  }

  ngAfterViewInit(): void {
    // Register this component as a drop target
    this._dropListService.registerDropList(this.dropList);

    // Initial scroll to current time after view initialization
    setTimeout(() => {
      this._scrollToCurrentTime();
    }, 100);
  }

  ngOnDestroy(): void {
    // Unregister the drop list when component is destroyed
    if (this.dropList) {
      this._dropListService.unregisterDropList(this.dropList);
    }

    // Ensure preview styling is cleaned up
    this._applySchedulePreviewStyling(false);
  }

  onDragEnter(event: CdkDragEnter<{ day: string }>): void {
    this._startScheduleMode();
  }

  onDragExit(): void {
    this._stopScheduleMode();
  }

  onDragMove(event: MouseEvent | TouchEvent): void {
    // If dragging continues and we re-enter without cdkDropListEntered firing,
    // auto-enable schedule mode when a CDK drag preview exists and it's not a schedule-event drag
    const dragPreview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
    if (dragPreview) {
      const isScheduleEventDrag = !!dragPreview.querySelector('schedule-event');
      if (!this.isDragging() && !isScheduleEventDrag) {
        this._startScheduleMode();
      }
    }
    if (!this.isDragging()) return;

    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    // Update position for the preview badge (still follow cursor for visibility)

    // Get the actual drag preview position to match what dropPoint will be
    let previewY = clientY;

    if (dragPreview) {
      const rect = dragPreview.getBoundingClientRect();
      // Use the top of the drag preview, which should match event.dropPoint
      previewY = rect.top;
    }

    // Calculate time based on the drag preview position (matching dropPoint logic)
    const timestamp = this._calculateTimeFromYPosition(previewY);
    this.lastCalculatedTimestamp = timestamp;

    if (timestamp) {
      const date = new Date(timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      // TODO internationalization
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
      this.dragPreviewTime.set(timeStr);
      this._updatePreviewTimeBadge(timeStr);
    }
  }

  private _calculateTimeFromYPosition(clientY: number): number | null {
    const containerElement = this.scheduleWeekRef?.nativeElement;
    const scheduleWeek = containerElement?.querySelector('.grid-container');

    if (!scheduleWeek) {
      return null;
    }

    const gridRect = scheduleWeek.getBoundingClientRect();
    const targetDay = this.daysToShow()[0]; // Get the current day being displayed
    return calculateTimeFromYPosition(clientY, gridRect, targetDay);
  }

  onTaskDrop(event: CdkDragDrop<{ day: string }, any, TaskWithSubTasks>): void {
    // Check if this is a schedule-event being dropped (internal drag)
    const dragElement = event.item.element.nativeElement;
    if (dragElement && dragElement.tagName.toLowerCase() === 'schedule-event') {
      // This is a schedule-event drop, let the schedule-week component handle it
      this.isDragging.set(false);
      this.dragPreviewTime.set(null);
      this.lastCalculatedTimestamp = null;
      return;
    }

    // Calculate drop time BEFORE clearing drag state (while preview element still exists)
    const dropTime = this._calculateDropTime();

    // Clear drag state after calculation
    this._stopScheduleMode();

    // Don't handle internal moves within the schedule
    if (event.previousContainer === event.container) {
      return;
    }

    const task = event.item.data;
    const targetDay = this.daysToShow()[0];

    if (task && targetDay) {
      if (dropTime !== null) {
        // No shift: Schedule the task at the specific time (new default behavior)
        this._store.dispatch(
          TaskSharedActions.scheduleTaskWithTime({
            task: task,
            dueWithTime: dropTime,
            isMoveToBacklog: false,
          }),
        );
        // Auto-assign a default duration if none is set
        if (!task.timeEstimate || task.timeEstimate <= 0) {
          this._store.dispatch(
            TaskSharedActions.updateTask({
              task: { id: task.id, changes: { timeEstimate: DEFAULT_MIN_DURATION } },
            }),
          );
        }
      } else {
        // Fallback to day-level scheduling if time calculation fails
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: task,
            day: targetDay,
            isAddToTop: true,
          }),
        );
      }
    }
  }

  // Prevent schedule-week event drags from entering this drop list
  dropListEnterPredicate = (drag: CdkDrag<unknown>): boolean => {
    const el = drag.element?.nativeElement as HTMLElement | null;
    // Deny if the dragged element is a schedule-event (handled internally by schedule-week)
    const isScheduleEvent = !!el && el.tagName.toLowerCase() === 'schedule-event';
    return !isScheduleEvent;
  };

  private _calculateDropTime(): number | null {
    // Use the exact timestamp that was calculated during the last drag move
    // This ensures perfect consistency between preview and actual scheduling
    const timestamp = this.lastCalculatedTimestamp;

    if (timestamp) {
      const targetDate = new Date(timestamp);
      const formattedTime = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;
      Log.log('[ScheduleDayPanel] Drop calculation:', {
        storedTimestamp: timestamp,
        targetTime: targetDate,
        formattedTime,
      });
    }

    return timestamp;
  }

  private _scrollToCurrentTime(): void {
    if (!this.scheduleWeekRef?.nativeElement) {
      Log.warn('[ScheduleDayPanel] No scheduleWeekRef available');
      return;
    }

    const currentTimeElement =
      this.scheduleWeekRef.nativeElement.querySelector('.current-time');
    if (!currentTimeElement) {
      Log.warn('[ScheduleDayPanel] Current time element not found');
      return;
    }

    // Find the scrollable container - it's the .side-inner in the better-drawer-container
    let scrollContainer = this.scheduleWeekRef.nativeElement.closest('.side-inner');

    // Fallback to other potential scrollable containers
    if (!scrollContainer) {
      scrollContainer = this.scheduleWeekRef.nativeElement.closest('.right-panel');
    }
    if (!scrollContainer) {
      scrollContainer = this.scheduleWeekRef.nativeElement.closest('[class*="panel"]');
    }

    if (!scrollContainer) {
      Log.warn('[ScheduleDayPanel] No scrollable container found');
      return;
    }

    Log.log('[ScheduleDayPanel] Found scroll container:', scrollContainer.className);

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = currentTimeElement.getBoundingClientRect();

    // Calculate the target scroll position to put current time indicator near the top
    const relativePosition = elementRect.top - containerRect.top;
    const topOffset = 50; // Small offset from very top for better visibility
    const targetScrollTop = scrollContainer.scrollTop + relativePosition - topOffset;

    Log.log('[ScheduleDayPanel] Scrolling to position:', Math.max(0, targetScrollTop));

    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      // behavior: 'smooth',
      // behavior: 'smooth',
    });
  }

  private _updatePreviewTimeBadge(timeStr: string): void {
    const preview = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
    if (!preview) return;
    const timeBadge = preview.querySelector(
      '.drag-preview-time-badge',
    ) as HTMLElement | null;
    if (timeBadge) {
      timeBadge.textContent = timeStr;
    }
  }

  private _startScheduleMode(): void {
    if (this.isDragging()) return;
    this.isDragging.set(true);
    this._applySchedulePreviewStyling(true);
    this._cdr.markForCheck();
    // Track pointer globally so we can leave schedule mode when not over panel
    document.addEventListener('mousemove', this._onGlobalPointerMove, {
      passive: true,
    });
    document.addEventListener('touchmove', this._onGlobalPointerMove, {
      passive: true,
    });
  }

  private _stopScheduleMode(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    this.dragPreviewTime.set(null);
    this.lastCalculatedTimestamp = null;
    this._applySchedulePreviewStyling(false);
    this._cdr.markForCheck();
    document.removeEventListener('mousemove', this._onGlobalPointerMove);
    document.removeEventListener('touchmove', this._onGlobalPointerMove);
  }

  private _onGlobalPointerMove = (ev: MouseEvent | TouchEvent): void => {
    // If pointer is not over the side panel/drop zone anymore, leave schedule mode
    const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
    const clientY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
    const dropZoneEl = this.dropList?.element?.nativeElement as HTMLElement | null;
    if (!dropZoneEl) {
      return;
    }
    const rect = dropZoneEl.getBoundingClientRect();
    const isInside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    if (!isInside) {
      // Re-enter Angular zone to ensure CD runs for OnPush
      this._ngZone.run(() => this._stopScheduleMode());
    }
  };

  // we're mutating the dom directly here to add some styling to the drag preview, since it is the most efficient way to do it
  private _applySchedulePreviewStyling(isEnable: boolean): void {
    const previewEl = document.querySelector('.cdk-drag-preview') as HTMLElement | null;
    if (!previewEl) {
      return;
    }

    if (previewEl.tagName.toLowerCase() === 'task') {
      if (isEnable) {
        previewEl.classList.add('as-schedule-event-preview');
        // Try to match the width of the day column
        const containerElement = this.scheduleWeekRef?.nativeElement as
          | HTMLElement
          | undefined;
        const day = this.daysToShow()[0];
        const colEl = containerElement?.querySelector(
          `.grid-container .col[data-day="${day}"]`,
        ) as HTMLElement | null;
        if (colEl) {
          const colRect = colEl.getBoundingClientRect();
          previewEl.style.width = `${Math.max(40, colRect.width - 10)}px`;
        }

        // ensure time badge element exists
        let timeBadge = previewEl.querySelector(
          '.drag-preview-time-badge',
        ) as HTMLElement | null;
        if (!timeBadge) {
          timeBadge = document.createElement('div');
          timeBadge.className = 'drag-preview-time-badge';
          previewEl.appendChild(timeBadge);
        }
        if (this.dragPreviewTime()) {
          timeBadge.textContent = this.dragPreviewTime()!;
        }
      } else {
        previewEl.classList.remove('as-schedule-event-preview');
        previewEl.style.removeProperty('width');
        const timeBadge = previewEl.querySelector('.drag-preview-time-badge');
        if (timeBadge) {
          timeBadge.remove();
        }
      }
    }

    // NOTE: this is mainly styled in schedule-week.component.scss via .cdk-drag-preview
    if (previewEl.tagName.toLowerCase() === 'schedule-event') {
      if (isEnable) {
        previewEl.style.opacity = `0`;
      } else {
        previewEl.style.opacity = `1`;
      }
    }
  }
}
