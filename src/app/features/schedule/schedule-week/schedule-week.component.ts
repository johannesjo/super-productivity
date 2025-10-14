/* eslint-disable @typescript-eslint/naming-convention */
import {
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
export class ScheduleWeekComponent implements OnInit, OnDestroy {
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
    const is12Hour = !this._dateTimeFormatService.is24HourFormat;
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
  private lastCalculatedTimestamp: number | null = null;

  // Custom drag preview properties
  currentDragEvent = signal<ScheduleEvent | null>(null);
  dragPreviewGridPosition = signal<{ col: number; row: number } | null>(null);
  dragPreviewStyle = signal<string | null>(null);

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
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    // Set up observer to detect resize operations
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentAniTimeout);
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);

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
    const targetEl = document.elementFromPoint(
      ev.pointerPosition.x,
      ev.pointerPosition.y,
    ) as HTMLElement;
    if (!targetEl) {
      return;
    }
    if (targetEl.classList.contains(DRAG_CLONE_CLASS)) {
      return;
    }

    // Update drag preview position for time indicator (always follow cursor)
    this.dragPreviewPosition.set({ x: ev.pointerPosition.x, y: ev.pointerPosition.y });

    // Calculate and show time preview when not in shift mode
    if (!this.isShiftNoScheduleMode()) {
      const gridContainer = this.gridContainer().nativeElement;
      if (gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect();

        // Check if we're still within the grid bounds
        const isWithinGrid =
          ev.pointerPosition.y >= gridRect.top &&
          ev.pointerPosition.y <= gridRect.bottom &&
          ev.pointerPosition.x >= gridRect.left &&
          ev.pointerPosition.x <= gridRect.right;

        if (isWithinGrid) {
          // Determine the day under the pointer more reliably
          const targetDay = this.getDayUnderPointer(
            ev.pointerPosition.x,
            ev.pointerPosition.y,
          );
          // Use the pointer Y position for time calculation
          const timestamp = calculateTimeFromYPosition(
            ev.pointerPosition.y,
            gridRect,
            targetDay,
          );

          // Store the calculated timestamp for use in dragReleased
          this.lastCalculatedTimestamp = timestamp;

          if (timestamp) {
            this.createDragPreview(timestamp, targetDay, ev.pointerPosition.y, gridRect);
          }
        } else {
          // Outside grid bounds - show unschedule indicator
          this.dragPreviewTime.set('UNSCHEDULE');
          this.lastCalculatedTimestamp = null;
        }
      }
    } else {
      // Clear time preview when in shift mode
      this.dragPreviewTime.set(null);
      this.lastCalculatedTimestamp = null;

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
    const rowSpan = draggedEvent
      ? Math.max(Math.round(draggedEvent.timeLeftInHours * FH), 1)
      : 6;

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

    // Hide the CDK's default drag preview by setting it invisible
    // We need to wait a bit for CDK to create its preview elements
    // TODO find a better way
    setTimeout(() => {
      // Hide CDK drag preview
      // const cdkDragPreview = document.querySelector('.cdk-drag-preview');
      // if (cdkDragPreview) {
      //   (cdkDragPreview as HTMLElement).style.display = 'none';
      // }
      // Hide CDK placeholder unless in shift mode (for task-to-task drop)
      // const cdkDragPlaceholder = document.querySelector('.cdk-drag-placeholder');
      // if (cdkDragPlaceholder) {
      //   if (this.isShiftNoScheduleMode()) {
      //     // Show placeholder in shift mode for task-to-task drops
      //     (cdkDragPlaceholder as HTMLElement).style.opacity = '0.3';
      //   } else {
      //     // Hide placeholder in normal drag mode (time-based scheduling)
      //     (cdkDragPlaceholder as HTMLElement).style.opacity = '0';
      //   }
      // }
    }, 0);
  }

  dragReleased(ev: CdkDragRelease): void {
    const prevEl = this.prevDragOverEl();

    const potentialTarget = prevEl ?? (ev.event.target as EventTarget | null);
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this.prevDragOverEl.set(null);
    }
    const cloneEl = this.dragCloneEl();
    if (cloneEl) {
      cloneEl.remove();
    }

    this.isDragging.set(false);
    ev.source.element.nativeElement.style.pointerEvents = '';
    // Restore original element visibility
    ev.source.element.nativeElement.style.opacity = '1';

    // Clear drag preview
    this.dragPreviewTime.set(null);
    this.currentDragEvent.set(null);
    this.dragPreviewGridPosition.set(null);
    this.dragPreviewStyle.set(null);
    const savedTimestamp = this.lastCalculatedTimestamp;
    this.lastCalculatedTimestamp = null;

    setTimeout(() => {
      if (ev.source.element?.nativeElement?.style) {
        ev.source.element.nativeElement.style.opacity = '';
        ev.source.element.nativeElement.style.pointerEvents = '';
      }
      this.isDraggingDelayed.set(false);
    }, 100);

    if (!(potentialTarget instanceof HTMLElement)) {
      ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
      ev.source.reset();
      return;
    }

    const target = potentialTarget;

    if (target.tagName.toLowerCase() === 'div' && target.classList.contains('col')) {
      const isMoveToEndOfDay = target.classList.contains('end-of-day');
      const targetDay = (target as any).day || target.getAttribute('data-day');
      if (targetDay) {
        if (this.isShiftNoScheduleMode()) {
          // Shift pressed: Plan for day (old behavior)
          this._store.dispatch(
            PlannerActions.planTaskForDay({
              task: ev.source.data.data,
              day: targetDay,
              isAddToTop: !isMoveToEndOfDay,
            }),
          );
        } else {
          // No shift: Schedule at specific time (new default behavior)
          // Use the saved timestamp from the drag operation
          const newTime = savedTimestamp;
          if (newTime) {
            const droppedTask = ev.source.data.data;
            const hasExistingSchedule = !!droppedTask.dueWithTime;
            const hasReminder = !!droppedTask.reminderId;
            const remindAt =
              !hasExistingSchedule && !hasReminder
                ? remindOptionToMilliseconds(newTime, TaskReminderOptionId.AtStart)
                : hasReminder
                  ? newTime
                  : undefined;

            const schedulePayload = {
              task: droppedTask,
              dueWithTime: newTime,
              ...(typeof remindAt === 'number' ? { remindAt } : {}),
              isMoveToBacklog: false,
            };

            this._store.dispatch(
              hasExistingSchedule
                ? TaskSharedActions.reScheduleTaskWithTime(schedulePayload)
                : TaskSharedActions.scheduleTaskWithTime(schedulePayload),
            );
            // Auto-assign a default duration if none is set
            if (!droppedTask.timeEstimate || droppedTask.timeEstimate <= 0) {
              const DEFAULT_BLOCK_DURATION = 15 * 60 * 1000;
              const fallbackDuration = Math.max(
                SCHEDULE_TASK_MIN_DURATION_IN_MS,
                DEFAULT_BLOCK_DURATION,
              );
              this._store.dispatch(
                TaskSharedActions.updateTask({
                  task: {
                    id: droppedTask.id,
                    changes: { timeEstimate: fallbackDuration },
                  },
                }),
              );
            }
          } else {
            // Fallback to day-level scheduling if time calculation fails
            this._store.dispatch(
              PlannerActions.planTaskForDay({
                task: ev.source.data.data,
                day: targetDay,
                isAddToTop: !isMoveToEndOfDay,
              }),
            );
          }
        }
      }
    } else if (target.tagName.toLowerCase() === 'schedule-event') {
      const sourceTaskId = ev.source.element.nativeElement.id.replace(T_ID_PREFIX, '');
      const targetTaskId = target.id.replace(T_ID_PREFIX, '');

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
    } else {
      // Dropped outside schedule area - check if we should unschedule
      const task = ev.source.data.data;
      const gridContainer = this.gridContainer().nativeElement;

      if (task && gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect();
        const dropPoint = {
          x:
            'clientX' in ev.event
              ? ev.event.clientX
              : (ev.event as TouchEvent).changedTouches?.[0]?.clientX || 0,
          y:
            'clientY' in ev.event
              ? ev.event.clientY
              : (ev.event as TouchEvent).changedTouches?.[0]?.clientY || 0,
        };

        // Check if dropped outside the grid area
        const isOutsideGrid =
          dropPoint.y < gridRect.top ||
          dropPoint.y > gridRect.bottom ||
          dropPoint.x < gridRect.left ||
          dropPoint.x > gridRect.right;

        if (isOutsideGrid) {
          // Reschedule for today (without time)
          this._store.dispatch(
            TaskSharedActions.planTasksForToday({ taskIds: [task.id] }),
          );
        }
      }
    }

    ev.source.element.nativeElement.style.transform = 'translate3d(0, 0, 0)';
    ev.source.reset();
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(true);
    }
    if (event.key === 'Control' || event.ctrlKey) {
      this.isCtrlPressed.set(true);
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.isShiftNoScheduleMode.set(false);
    }
    if (event.key === 'Control' || !event.ctrlKey) {
      this.isCtrlPressed.set(false);
    }
  };

  private setupResizeObserver(): void {
    // Observe for changes to is-resizing class on any schedule-event
    this._resizeObserver = new MutationObserver(() => {
      // Check if any schedule-event has the is-resizing class
      const resizingElements = document.querySelectorAll('schedule-event.is-resizing');
      this.isAnyEventResizing.set(resizingElements.length > 0);
    });

    // Start observing the entire document for class changes
    this._resizeObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }
}
