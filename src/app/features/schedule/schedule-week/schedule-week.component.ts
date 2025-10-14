/* eslint-disable @typescript-eslint/naming-convention */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
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
import { TranslatePipe } from '@ngx-translate/core';
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

    // Add keyboard event listeners for shift key
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  ngAfterViewInit(): void {
    this._setupResizeObserver();
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentAniTimeout);
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);

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
    // Track the last known pointer position so we can fall back to it when the
    // release event doesn't expose a reliable target (common for touch).
    this._lastPointerPosition = pointer;

    // Collect all relevant elements at the pointer. This allows us to bypass
    // the drag preview element and grab the underlying `.col` grid cell or the
    // `schedule-event` when hovering other tasks.
    const elementsAtPoint = document.elementsFromPoint(pointer.x, pointer.y);
    const interactiveElements = elementsAtPoint.filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        !el.classList.contains(DRAG_CLONE_CLASS) &&
        !el.classList.contains('custom-drag-preview'),
    );

    if (interactiveElements.length) {
      // Cache the most recent drop targets to reuse during dragReleased.
      this._lastDropCol =
        interactiveElements.find((el) => el.classList.contains('col')) || null;
      this._lastDropScheduleEvent =
        interactiveElements.find((el) => el.tagName.toLowerCase() === 'schedule-event') ||
        null;
    }

    const targetEl =
      interactiveElements[0] ||
      (document.elementFromPoint(pointer.x, pointer.y) as HTMLElement | null);
    if (!targetEl || targetEl.classList.contains(DRAG_CLONE_CLASS)) {
      return;
    }

    // Update drag preview position for visual indicator (always follow pointer)
    this.dragPreviewPosition.set({ x: pointer.x, y: pointer.y });

    const gridContainer = this.gridContainer().nativeElement;
    if (!gridContainer) {
      return;
    }
    const gridRect = gridContainer.getBoundingClientRect();
    const isWithinGrid =
      pointer.y >= gridRect.top &&
      pointer.y <= gridRect.bottom &&
      pointer.x >= gridRect.left &&
      pointer.x <= gridRect.right;
    const targetDay = this.getDayUnderPointer(pointer.x, pointer.y);

    if (this.isShiftNoScheduleMode()) {
      // Day-plan mode: keep preview visible but remove the time badge.
      this._lastCalculatedTimestamp = null;

      if (isWithinGrid) {
        const timestamp = calculateTimeFromYPosition(pointer.y, gridRect, targetDay);
        if (timestamp) {
          this.createDragPreview(timestamp, targetDay, pointer.y, gridRect);
          this.dragPreviewTime.set(null);
        }
      } else {
        this.dragPreviewStyle.set(null);
      }

      const prevEl = this.prevDragOverEl();
      if (targetEl !== prevEl) {
        if (prevEl) {
          prevEl.classList.remove(DRAG_OVER_CLASS);
        }
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
    } else {
      if (isWithinGrid) {
        const timestamp = calculateTimeFromYPosition(pointer.y, gridRect, targetDay);

        // Store the calculated timestamp for use in dragReleased
        this._lastCalculatedTimestamp = timestamp;

        if (timestamp) {
          this.createDragPreview(timestamp, targetDay, pointer.y, gridRect);
        }
      } else {
        // Outside grid bounds - show unschedule indicator
        this.dragPreviewTime.set('UNSCHEDULE');
        this._lastCalculatedTimestamp = null;
      }
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

  private createDragPreview(
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
    const draggedEvent = this.currentDragEvent();
    let rowSpan = 6; // default fallback

    if (draggedEvent) {
      // For tasks, use the full timeEstimate instead of timeLeftInHours (which is split)
      const task = draggedEvent.data as any;
      if (task?.timeEstimate) {
        const timeInHours = task.timeEstimate / (1000 * 60 * 60);
        rowSpan = Math.max(Math.round(timeInHours * FH), 1);
      } else {
        // Fallback to timeLeftInHours for non-task events
        rowSpan = Math.max(Math.round(draggedEvent.timeLeftInHours * FH), 1);
      }
    }

    // Create grid style for preview
    const gridStyle = [
      `grid-row: ${row} / span ${rowSpan}`,
      `grid-column: ${col} / span 1`,
      'z-index: 1000',
      'opacity: 0.8',
      'transform: scale(0.95)',
      'border: 3px solid #2196F3 !important',
      'box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important',
      'border-radius: 4px !important',
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

    let colEl = this._lastDropCol;
    let scheduleEventTarget = this._lastDropScheduleEvent;
    if ((!colEl || !scheduleEventTarget) && ev.event.target instanceof HTMLElement) {
      const fallbackTarget = ev.event.target as HTMLElement;
      if (!colEl) {
        colEl = fallbackTarget.closest('.col') as HTMLElement | null;
      }
      if (!scheduleEventTarget) {
        scheduleEventTarget = fallbackTarget.closest(
          'schedule-event',
        ) as HTMLElement | null;
      }
    }

    const task = ev.source.data.data as any;

    if (colEl && task) {
      const isMoveToEndOfDay = colEl.classList.contains('end-of-day');
      const targetDay =
        colEl.getAttribute('data-day') ||
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
          let scheduleTime = savedTimestamp;
          if (scheduleTime == null && dropPoint) {
            const gridContainer = this.gridContainer().nativeElement;
            if (gridContainer) {
              const gridRect = gridContainer.getBoundingClientRect();
              scheduleTime = calculateTimeFromYPosition(dropPoint.y, gridRect, targetDay);
            }
          }

          if (scheduleTime != null) {
            const hasExistingSchedule = !!task.dueWithTime;
            const hasReminder = !!task.reminderId;
            const remindAt =
              !hasExistingSchedule && !hasReminder
                ? remindOptionToMilliseconds(scheduleTime, TaskReminderOptionId.AtStart)
                : hasReminder
                  ? scheduleTime
                  : undefined;

            const schedulePayload = {
              task,
              dueWithTime: scheduleTime,
              ...(typeof remindAt === 'number' ? { remindAt } : {}),
              isMoveToBacklog: false,
            };

            this._store.dispatch(
              hasExistingSchedule
                ? TaskSharedActions.reScheduleTaskWithTime(schedulePayload)
                : TaskSharedActions.scheduleTaskWithTime(schedulePayload),
            );

            if (!task.timeEstimate || task.timeEstimate <= 0) {
              const DEFAULT_BLOCK_DURATION = 15 * 60 * 1000;
              const fallbackDuration = Math.max(
                SCHEDULE_TASK_MIN_DURATION_IN_MS,
                DEFAULT_BLOCK_DURATION,
              );
              this._store.dispatch(
                TaskSharedActions.updateTask({
                  task: {
                    id: task.id,
                    changes: { timeEstimate: fallbackDuration },
                  },
                }),
              );
            }
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
    } else if (task && dropPoint) {
      const gridContainer = this.gridContainer().nativeElement;
      if (gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect();
        const isOutsideGrid =
          dropPoint.y < gridRect.top ||
          dropPoint.y > gridRect.bottom ||
          dropPoint.x < gridRect.left ||
          dropPoint.x > gridRect.right;

        if (isOutsideGrid) {
          this._store.dispatch(
            TaskSharedActions.planTasksForToday({ taskIds: [task.id] }),
          );
        }
      }
    }

    this._lastDropCol = null;
    this._lastDropScheduleEvent = null;
    this._lastPointerPosition = null;

    nativeEl.style.transform = 'translate3d(0, 0, 0)';
    ev.source.reset();
  }

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(true);
    }
    if (event.key === 'Control' || event.ctrlKey) {
      this.isCtrlPressed.set(true);
    }
  };

  private _onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(false);
    }
    if (event.key === 'Control' || !event.ctrlKey) {
      this.isCtrlPressed.set(false);
    }
  };

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
