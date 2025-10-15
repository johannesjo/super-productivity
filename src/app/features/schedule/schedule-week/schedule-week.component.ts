/* eslint-disable @typescript-eslint/naming-convention */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  HostListener,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ScheduleEvent } from '../schedule.model';
import { CdkDragMove, CdkDragRelease, CdkDragStart } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import {
  FH,
  SCHEDULE_TASK_MIN_DURATION_IN_MS,
  SVEType,
  T_ID_PREFIX,
} from '../schedule.const';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { calculateTimeFromYPosition } from '../schedule-utils';
import { isDraggableSE } from '../map-schedule-data/is-schedule-types-type';
import { throttle } from '../../../util/decorators';
import { CreateTaskPlaceholderComponent } from '../create-task-placeholder/create-task-placeholder.component';
import { ScheduleEventComponent } from '../schedule-event/schedule-event.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { T } from '../../../t.const';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { DRAG_DELAY_FOR_TOUCH } from '../../../app.constants';
import { MatTooltip } from '@angular/material/tooltip';
import { DateTimeFormatService } from '../../../core/date-time-format/date-time-format.service';
import { LocaleDatePipe } from '../../../ui/pipes/locale-date.pipe';
import { remindOptionToMilliseconds } from '../../tasks/util/remind-option-to-milliseconds';
import { TaskReminderOptionId } from '../../tasks/task.model';

const D_HOURS = 24;
const DRAG_CLONE_CLASS = 'drag-clone';
const DRAG_OVER_CLASS = 'drag-over';

@Component({
  selector: 'schedule-week',
  imports: [
    ScheduleEventComponent,
    CreateTaskPlaceholderComponent,
    MatIcon,
    TranslatePipe,
    MatTooltip,
    LocaleDatePipe,
  ],
  templateUrl: './schedule-week.component.html',
  styleUrl: './schedule-week.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  host: {
    '[class.isCtrlKeyPressed]': 'isCtrlPressed()',
    '[class.isShiftKeyPressed]': 'isShiftNoScheduleMode()',
    '[class.is-dragging]': 'isDragging()',
    '[class.is-not-dragging]': '!isDragging()',
    '[class]': 'dragEventTypeClass()',
  },
})
export class ScheduleWeekComponent implements OnInit, AfterViewInit, OnDestroy {
  private _store = inject(Store);
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _translateService = inject(TranslateService);

  isMinimalHeader = input<boolean>(false);
  events = input<ScheduleEvent[] | null>([]);
  beyondBudget = input<ScheduleEvent[][] | null>([]);
  daysToShow = input<string[]>([]);
  workStartEnd = input<{ workStartRow: number; workEndRow: number } | null>(null);
  currentTimeRow = input<number>(0);
  isCtrlPressed = signal<boolean>(false);
  isTaskDragActive = input<boolean>(false);

  // Track shift key during drag operations
  isShiftNoScheduleMode = signal(false);

  FH = FH;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  DRAG_DELAY_FOR_TOUCH = DRAG_DELAY_FOR_TOUCH;
  SVEType: typeof SVEType = SVEType;
  T: typeof T = T;
  protected readonly isDraggableSE = isDraggableSE;

  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index).filter(
    (_, index) => index % FH === 0,
  );

  times = computed(() => {
    const is12Hour = !this._dateTimeFormatService.is24HourFormat();
    return this.rowsByNr.map((_, index) => {
      if (is12Hour) {
        if (index === 0) {
          return '12:00 AM'; // Midnight
        } else if (index === 12) {
          return '12:00 PM'; // Noon
        } else if (index < 12) {
          return index.toString() + ':00 AM';
        } else {
          return (index - 12).toString() + ':00 PM';
        }
      } else {
        return index.toString() + ':00';
      }
    });
  });

  endOfDayColRowStart = signal<number>(D_HOURS * 0.5 * FH);
  totalRows: number = D_HOURS * FH;

  safeEvents = computed(() => this.events() || []);
  safeBeyondBudget = computed(() => this.beyondBudget() || []);

  newTaskPlaceholder = signal<{
    style: string;
    time: string;
    date: string;
  } | null>(null);

  isDragging = signal(false);
  isDraggingDelayed = signal(false);
  isCreateTaskActive = signal(false);
  prevDragOverEl = signal<HTMLElement | null>(null);
  dragCloneEl = signal<HTMLElement | null>(null);

  // Drag preview properties for time indicator
  dragPreviewTime = signal<string | null>(null);
  dragPreviewPosition = signal({ x: 0, y: 0 });
  private _lastCalculatedTimestamp: number | null = null;

  // Custom drag preview properties
  currentDragEvent = signal<ScheduleEvent | null>(null);
  dragPreviewGridPosition = signal<{ col: number; row: number } | null>(null);
  dragPreviewStyle = signal<string | null>(null);
  // Remember the last column and schedule-event under the pointer during a drag.
  // Touch interactions hide the underlying element with the drag preview, so we
  // cache these references while the pointer is moving and reuse them on release.
  private _lastDropCol: HTMLElement | null = null;
  private _lastDropScheduleEvent: HTMLElement | null = null;
  private _lastPointerPosition: { x: number; y: number } | null = null;

  // Track if any event is being resized
  isAnyEventResizing = signal(false);

  // Computed class for drag event type
  dragEventTypeClass = computed(() => {
    const currentEvent = this.currentDragEvent();
    return currentEvent ? currentEvent.type : '';
  });

  // Show shift key info tooltip
  showShiftKeyInfo = signal(false);

  readonly gridContainer = viewChild.required<ElementRef>('gridContainer');

  private _currentAniTimeout: number | undefined;
  private _resizeObserver?: MutationObserver;

  ngOnInit(): void {
    const workStartEnd = this.workStartEnd();
    this.endOfDayColRowStart.set(workStartEnd?.workStartRow || D_HOURS * 0.5 * FH);
  }

  ngAfterViewInit(): void {
    this._setupResizeObserver();
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentAniTimeout);
    // Clean up resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  onGridClick(ev: MouseEvent): void {
    if (ev.target instanceof HTMLElement) {
      if (ev.target.classList.contains('col')) {
        this.isCreateTaskActive.set(true);
      }
    }
  }

  @throttle(30)
  onMoveOverGrid(ev: MouseEvent): void {
    if (this.isDragging() || this.isDraggingDelayed()) {
      return;
    }
    if (this.isCreateTaskActive()) {
      return;
    }

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

      // for mobile, we use blocks of 15 minutes
      // eslint-disable-next-line no-mixed-operators
      const targetRow = IS_TOUCH_PRIMARY ? Math.floor(rowIndex / 3) * 3 - 1 : rowIndex;
      const row = targetRow + targetColRowOffset;
      const hours = Math.floor((row - 1) / FH);
      const minutes = Math.floor(((row - 1) % FH) * (60 / FH));
      const time = `${hours}:${minutes.toString().padStart(2, '0')}`;

      this.newTaskPlaceholder.set({
        style: `grid-row: ${row} / span 6; grid-column: ${targetColColOffset} / span 1`,
        time,
        date: this.daysToShow()[targetColColOffset - 2],
      });
    } else {
      this.newTaskPlaceholder.set(null);
    }
  }

  @throttle(30)
  dragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    if (!this.isDragging()) {
      return;
    }

    ev.source.element.nativeElement.style.pointerEvents = 'none';
    const pointer = { x: ev.pointerPosition.x, y: ev.pointerPosition.y };
    const targetEl = this._updatePointerCaches(pointer);
    if (!targetEl) {
      return;
    }

    // Update drag preview position for visual indicator (always follow pointer)
    this.dragPreviewPosition.set({ x: pointer.x, y: pointer.y });

    const gridContainer = this.gridContainer().nativeElement;
    if (!gridContainer) {
      return;
    }
    const gridRect = gridContainer.getBoundingClientRect();
    const targetDay = this.getDayUnderPointer(pointer.x, pointer.y);
    const isWithinGrid = this._isWithinGrid(pointer, gridRect);

    if (this.isShiftNoScheduleMode()) {
      this._handleShiftDragMove(targetEl, pointer, gridRect, targetDay, isWithinGrid);
    } else {
      this._handleTimeDragMove(pointer, gridRect, targetDay, isWithinGrid);
    }
  }

  private getDayUnderPointer(x: number, y: number): string {
    const elementsAtPoint = document.elementsFromPoint(x, y) as HTMLElement[];
    const colEl = elementsAtPoint.find(
      (el) => el?.classList?.contains('col') && el.hasAttribute('data-day'),
    ) as HTMLElement | undefined;
    if (colEl) {
      const d = colEl.getAttribute('data-day');
      if (d) {
        return d;
      }
    }
    return this.daysToShow()[0];
  }

  private _createDragPreview(
    timestamp: number,
    targetDay: string,
    pointerY: number,
    gridRect: DOMRect,
  ): void {
    // Set time preview
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    this.dragPreviewTime.set(timeStr);

    // Calculate grid position
    const relativeY = pointerY - gridRect.top;
    const totalRows = 24 * FH; // Total rows = 24 hours * FH rows per hour
    const rowHeight = gridRect.height / totalRows;
    const row = Math.round(relativeY / rowHeight) + 1;

    const dayIndex = this.daysToShow().findIndex((day) => day === targetDay);
    const col = dayIndex + 2; // +2 because column 1 is time column

    // Calculate correct row span based on event duration
    const rowSpan = this._calculateRowSpan(this.currentDragEvent());

    // Create grid style for preview
    const gridStyle = [
      `grid-row: ${row} / span ${rowSpan}`,
      `grid-column: ${col} / span 1`,
    ].join('; ');

    this.dragPreviewStyle.set(gridStyle);
  }

  dragStarted(ev: CdkDragStart<ScheduleEvent>): void {
    this.isDragging.set(true);
    this.isDraggingDelayed.set(true);

    // Set the current dragging event for custom preview
    this.currentDragEvent.set(ev.source.data);
    this._lastDropCol = null;
    this._lastDropScheduleEvent = null;
    this._lastPointerPosition = null;

    // Show shift key info on non-touch devices
    if (!IS_TOUCH_PRIMARY) {
      this.showShiftKeyInfo.set(true);
      // Hide after 3 seconds
      setTimeout(() => {
        this.showShiftKeyInfo.set(false);
      }, 3000);
    }

    const cur = ev.source.element.nativeElement;

    // Hide the original element being dragged
    cur.style.opacity = '0';

    // Remove any existing clone
    const cloneEl = this.dragCloneEl();
    if (cloneEl) {
      cloneEl.remove();
    }
  }

  dragReleased(ev: CdkDragRelease): void {
    const prevEl = this.prevDragOverEl();
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this.prevDragOverEl.set(null);
    }

    const dropPoint = this._lastPointerPosition ?? this._extractDropPoint(ev.event);
    const cloneEl = this.dragCloneEl();
    if (cloneEl) {
      cloneEl.remove();
    }

    this.isDragging.set(false);
    const nativeEl = ev.source.element.nativeElement;
    nativeEl.style.pointerEvents = '';
    nativeEl.style.opacity = '1';

    this.dragPreviewTime.set(null);
    this.currentDragEvent.set(null);
    this.dragPreviewGridPosition.set(null);
    this.dragPreviewStyle.set(null);
    const savedTimestamp = this._lastCalculatedTimestamp;
    this._lastCalculatedTimestamp = null;

    setTimeout(() => {
      nativeEl.style.opacity = '';
      nativeEl.style.pointerEvents = '';
      this.isDraggingDelayed.set(false);
    }, 100);

    const { columnTarget, scheduleEventTarget } = this._resolveDropTargets(ev);
    const task = ev.source.data.data as any;

    if (columnTarget && task) {
      const isMoveToEndOfDay = columnTarget.classList.contains('end-of-day');
      const targetDay =
        columnTarget.getAttribute('data-day') ||
        (dropPoint ? this.getDayUnderPointer(dropPoint.x, dropPoint.y) : null);

      if (targetDay) {
        if (this.isShiftNoScheduleMode()) {
          this._store.dispatch(
            PlannerActions.planTaskForDay({
              task,
              day: targetDay,
              isAddToTop: !isMoveToEndOfDay,
            }),
          );
        } else {
          const scheduleTime =
            savedTimestamp ??
            (dropPoint ? this._calculateTimeFromDrop(dropPoint, targetDay) : null);

          if (scheduleTime != null) {
            this._scheduleTask(task, scheduleTime);
          } else {
            this._store.dispatch(
              PlannerActions.planTaskForDay({
                task,
                day: targetDay,
                isAddToTop: !isMoveToEndOfDay,
              }),
            );
          }
        }
      }
    } else if (scheduleEventTarget) {
      const sourceTaskId = nativeEl.id.replace(T_ID_PREFIX, '');
      const targetTaskId = scheduleEventTarget.id.replace(T_ID_PREFIX, '');

      if (
        sourceTaskId &&
        sourceTaskId.length > 0 &&
        targetTaskId &&
        sourceTaskId !== targetTaskId
      ) {
        this._store.dispatch(
          PlannerActions.moveBeforeTask({
            fromTask: ev.source.data.data,
            toTaskId: targetTaskId,
          }),
        );
      }
    } else if (task && dropPoint && this._isOutsideGrid(dropPoint)) {
      this._store.dispatch(TaskSharedActions.planTasksForToday({ taskIds: [task.id] }));
    }

    this._resetDragCaches();
    nativeEl.style.transform = 'translate3d(0, 0, 0)';
    ev.source.reset();
  }

  private _resolveDropTargets(ev: CdkDragRelease): {
    columnTarget: HTMLElement | null;
    scheduleEventTarget: HTMLElement | null;
  } {
    let columnTarget = this._lastDropCol;
    let scheduleEventTarget = this._lastDropScheduleEvent;

    if (
      (!columnTarget || !scheduleEventTarget) &&
      ev.event.target instanceof HTMLElement
    ) {
      const fallback = ev.event.target as HTMLElement;
      if (!columnTarget) {
        columnTarget = fallback.closest('.col') as HTMLElement | null;
      }
      if (!scheduleEventTarget) {
        scheduleEventTarget = fallback.closest('schedule-event') as HTMLElement | null;
      }
    }

    return { columnTarget, scheduleEventTarget };
  }

  private _calculateTimeFromDrop(
    dropPoint: { x: number; y: number },
    targetDay: string,
  ): number | null {
    const gridContainer = this.gridContainer().nativeElement;
    if (!gridContainer) {
      return null;
    }
    const gridRect = gridContainer.getBoundingClientRect();
    return calculateTimeFromYPosition(dropPoint.y, gridRect, targetDay);
  }

  private _isOutsideGrid(dropPoint: { x: number; y: number }): boolean {
    const gridContainer = this.gridContainer().nativeElement;
    if (!gridContainer) {
      return false;
    }
    const gridRect = gridContainer.getBoundingClientRect();
    return (
      dropPoint.y < gridRect.top ||
      dropPoint.y > gridRect.bottom ||
      dropPoint.x < gridRect.left ||
      dropPoint.x > gridRect.right
    );
  }

  private _scheduleTask(task: any, scheduleTime: number): void {
    const hasExistingSchedule = !!task?.dueWithTime;
    const hasReminder = !!task?.reminderId;
    const remindAt =
      !hasExistingSchedule && !hasReminder
        ? remindOptionToMilliseconds(scheduleTime, TaskReminderOptionId.AtStart)
        : hasReminder
          ? scheduleTime
          : undefined;

    const payload = {
      task,
      dueWithTime: scheduleTime,
      ...(typeof remindAt === 'number' ? { remindAt } : {}),
      isMoveToBacklog: false,
    };

    this._store.dispatch(
      hasExistingSchedule
        ? TaskSharedActions.reScheduleTaskWithTime(payload)
        : TaskSharedActions.scheduleTaskWithTime(payload),
    );

    if (!task.timeEstimate || task.timeEstimate <= 0) {
      const fallbackDuration = Math.max(SCHEDULE_TASK_MIN_DURATION_IN_MS, 15 * 60 * 1000);
      this._store.dispatch(
        TaskSharedActions.updateTask({
          task: {
            id: task.id,
            changes: { timeEstimate: fallbackDuration },
          },
        }),
      );
    }
  }

  private _resetDragCaches(): void {
    this._lastDropCol = null;
    this._lastDropScheduleEvent = null;
    this._lastPointerPosition = null;
  }

  private _updatePointerCaches(pointer: { x: number; y: number }): HTMLElement | null {
    this._lastPointerPosition = pointer;
    const elementsAtPoint = document.elementsFromPoint(pointer.x, pointer.y);
    const interactiveElements = elementsAtPoint.filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        !el.classList.contains(DRAG_CLONE_CLASS) &&
        !el.classList.contains('custom-drag-preview'),
    );

    if (interactiveElements.length) {
      this._lastDropCol =
        interactiveElements.find((el) => el.classList.contains('col')) || null;
      this._lastDropScheduleEvent =
        interactiveElements.find((el) => el.tagName.toLowerCase() === 'schedule-event') ||
        null;
      const targetEl = interactiveElements[0];
      return targetEl.classList.contains(DRAG_CLONE_CLASS) ? null : targetEl;
    }

    const fallback = document.elementFromPoint(
      pointer.x,
      pointer.y,
    ) as HTMLElement | null;
    if (fallback && !fallback.classList.contains(DRAG_CLONE_CLASS)) {
      return fallback;
    }
    return null;
  }

  private _handleShiftDragMove(
    targetEl: HTMLElement,
    pointer: { x: number; y: number },
    gridRect: DOMRect,
    targetDay: string,
    isWithinGrid: boolean,
  ): void {
    this._lastCalculatedTimestamp = null;
    let badgeText: string | null = null;

    if (isWithinGrid) {
      const timestamp = calculateTimeFromYPosition(pointer.y, gridRect, targetDay);
      if (timestamp) {
        this._createDragPreview(timestamp, targetDay, pointer.y, gridRect);
      }
      if (targetEl.classList.contains('col')) {
        badgeText = targetEl.classList.contains('end-of-day')
          ? this._translateService.instant(T.F.SCHEDULE.PLAN_END_DAY)
          : this._translateService.instant(T.F.SCHEDULE.PLAN_START_DAY);
      }
    } else {
      this.dragPreviewStyle.set(null);
      badgeText = null;
    }
    this.dragPreviewTime.set(badgeText);

    const prevEl = this.prevDragOverEl();
    if (prevEl && prevEl !== targetEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
    }
    if (prevEl !== targetEl) {
      this.prevDragOverEl.set(targetEl);
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

  private _handleTimeDragMove(
    pointer: { x: number; y: number },
    gridRect: DOMRect,
    targetDay: string,
    isWithinGrid: boolean,
  ): void {
    const prevEl = this.prevDragOverEl();
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this.prevDragOverEl.set(null);
    }

    if (isWithinGrid) {
      const timestamp = calculateTimeFromYPosition(pointer.y, gridRect, targetDay);

      this._lastCalculatedTimestamp = timestamp;

      if (timestamp) {
        this._createDragPreview(timestamp, targetDay, pointer.y, gridRect);
      }
    } else {
      this.dragPreviewTime.set('UNSCHEDULE');
      this._lastCalculatedTimestamp = null;
    }
  }

  private _isWithinGrid(pointer: { x: number; y: number }, gridRect: DOMRect): boolean {
    return (
      pointer.y >= gridRect.top &&
      pointer.y <= gridRect.bottom &&
      pointer.x >= gridRect.left &&
      pointer.x <= gridRect.right
    );
  }

  private _calculateRowSpan(event: ScheduleEvent | null): number {
    if (!event) {
      return 6;
    }
    const task = event.data as any;
    if (task?.timeEstimate) {
      const timeInHours = task.timeEstimate / (60 * 60 * 1000);
      return Math.max(Math.round(timeInHours * FH), 1);
    }
    return Math.max(Math.round(event.timeLeftInHours * FH), 1);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(true);
    }
    if (event.key === 'Control' || event.ctrlKey) {
      this.isCtrlPressed.set(true);
    }
  }

  @HostListener('document:keyup', ['$event'])
  onDocumentKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(false);
    }
    if (event.key === 'Control' || !event.ctrlKey) {
      this.isCtrlPressed.set(false);
    }
  }

  private _extractDropPoint(
    event: MouseEvent | TouchEvent | PointerEvent,
  ): { x: number; y: number } | null {
    // Mouse and pointer events expose client coordinates directly.
    if ('clientX' in event) {
      return { x: event.clientX, y: event.clientY };
    }
    // Touchend exposes coordinates via changedTouches; touchmove via touches.
    if ('changedTouches' in event && event.changedTouches?.length) {
      const touch = event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    if ('touches' in event && event.touches?.length) {
      const touch = event.touches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return null;
  }

  private _setupResizeObserver(): void {
    const gridContainer = this.gridContainer().nativeElement;
    if (!gridContainer) {
      return;
    }

    // Observe for changes to is-resizing class on schedule-event elements
    this._resizeObserver = new MutationObserver(() => {
      const resizingElements = gridContainer.querySelectorAll(
        'schedule-event.is-resizing',
      );
      this.isAnyEventResizing.set(resizingElements.length > 0);
    });

    // Observe only the grid container instead of entire document for better performance
    this._resizeObserver.observe(gridContainer, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }
}
