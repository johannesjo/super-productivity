import { CdkDragMove, CdkDragRelease, CdkDragStart } from '@angular/cdk/drag-drop';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import {
  FH,
  SCHEDULE_TASK_MIN_DURATION_IN_MS,
  SVEType,
  T_ID_PREFIX,
} from '../schedule.const';
import { remindOptionToMilliseconds } from '../../tasks/util/remind-option-to-milliseconds';
import { TaskCopy, TaskReminderOptionId } from '../../tasks/task.model';
import { calculateTimeFromYPosition } from '../schedule-utils';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import type { DragPreviewContext } from './schedule-week-drag.types';
import type { ScheduleEvent } from '../schedule.model';

interface PointerPosition {
  x: number;
  y: number;
}

const DRAG_CLONE_CLASS = 'drag-clone';
const DRAG_OVER_CLASS = 'drag-over';

@Injectable()
export class ScheduleWeekDragService {
  // Central drag state handler so the component can remain mostly declarative.
  private readonly _store = inject(Store);

  // Use accessors instead of direct references to prevent holding stale DOM nodes
  // between Angular re-renders. This ensures we always query the current DOM state.
  private _gridContainerAccessor: (() => HTMLElement | null) | null = null;
  private _daysToShowAccessor: (() => readonly string[]) | null = null;
  private readonly _isShiftMode = signal(false);
  readonly isShiftMode: Signal<boolean> = this._isShiftMode.asReadonly();

  private readonly _dragPreviewContext = signal<DragPreviewContext>(null);
  readonly dragPreviewContext: Signal<DragPreviewContext> =
    this._dragPreviewContext.asReadonly();

  private readonly _dragPreviewStyle = signal<string | null>(null);
  readonly dragPreviewStyle: Signal<string | null> = this._dragPreviewStyle.asReadonly();

  private readonly _currentDragEvent = signal<ScheduleEvent | null>(null);
  readonly currentDragEvent: Signal<ScheduleEvent | null> =
    this._currentDragEvent.asReadonly();

  private _prevDragOverEl: HTMLElement | null = null;
  private _dragCloneEl: HTMLElement | null = null;

  private readonly _isDragging = signal(false);
  readonly isDragging: Signal<boolean> = this._isDragging.asReadonly();

  // Delayed flag stays true briefly after drag ends to prevent UI flicker
  // during the reset animation (see handleDragReleased timeout).
  private readonly _isDraggingDelayed = signal(false);
  readonly isDraggingDelayed: Signal<boolean> = this._isDraggingDelayed.asReadonly();

  private readonly _showShiftKeyInfo = signal(false);
  readonly showShiftKeyInfo: Signal<boolean> = this._showShiftKeyInfo.asReadonly();

  private _lastDropCol: HTMLElement | null = null;
  private _lastDropScheduleEvent: HTMLElement | null = null;
  private _lastPointerPosition: PointerPosition | null = null;
  private _lastCalculatedTimestamp: number | null = null;
  private _shiftInfoTimeoutId: number | undefined;

  destroy(): void {
    this._clearShiftInfoTimeout();
    this._gridContainerAccessor = null;
    this._daysToShowAccessor = null;
    this._resetDragCaches();
  }

  setGridContainer(accessor: () => HTMLElement | null): void {
    // Resolve the container lazily so we don't hold on to stale DOM nodes between renders.
    this._gridContainerAccessor = accessor;
  }

  clearGridContainer(): void {
    this._gridContainerAccessor = null;
  }

  setDaysToShowAccessor(accessor: () => readonly string[]): void {
    this._daysToShowAccessor = accessor;
  }

  clearDaysToShowAccessor(): void {
    this._daysToShowAccessor = null;
  }

  setShiftMode(isShiftMode: boolean): void {
    if (this._isShiftMode() !== isShiftMode) {
      this._isShiftMode.set(isShiftMode);
    }
  }

  handleDragStarted(ev: CdkDragStart<ScheduleEvent>): void {
    this._isDragging.set(true);
    this._isDraggingDelayed.set(true);
    this._currentDragEvent.set(ev.source.data);
    this._dragPreviewContext.set(null);
    this._lastDropCol = null;
    this._lastDropScheduleEvent = null;
    this._lastPointerPosition = null;
    this._lastCalculatedTimestamp = null;

    // Show shift key tooltip on non-touch devices to educate users about the feature,
    // then auto-hide after 3 seconds to avoid cluttering the interface.
    if (!IS_TOUCH_PRIMARY) {
      this._showShiftKeyInfo.set(true);
      this._shiftInfoTimeoutId = window.setTimeout(() => {
        this._showShiftKeyInfo.set(false);
        this._shiftInfoTimeoutId = undefined;
      }, 3000);
    }

    const nativeEl = ev.source.element.nativeElement;

    // Hide the original element during drag so only the CDK preview is visible.
    nativeEl.style.opacity = '0';

    const cloneEl = this._dragCloneEl;
    if (cloneEl) {
      cloneEl.remove();
      this._dragCloneEl = null;
    }
  }

  handleDragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    if (!this._isDragging()) {
      return;
    }

    // Disable pointer events on the dragged element so elementFromPoint
    // can detect what's underneath it, not the drag preview itself.
    ev.source.element.nativeElement.style.pointerEvents = 'none';
    const pointer: PointerPosition = {
      x: ev.pointerPosition.x,
      y: ev.pointerPosition.y,
    };
    const targetEl = this._updatePointerCaches(pointer);
    if (!targetEl) {
      return;
    }

    const gridContainer = this._gridContainer();
    if (!gridContainer) {
      return;
    }

    const gridRect = gridContainer.getBoundingClientRect();
    const targetDay = this._getDayUnderPointer(pointer.x, pointer.y);
    const isWithinGrid = this._isWithinGrid(pointer, gridRect);

    if (this.isShiftMode()) {
      this._handleShiftDragMove(targetEl, pointer, gridRect, targetDay, isWithinGrid);
    } else {
      this._handleTimeDragMove(pointer, gridRect, targetDay, isWithinGrid);
    }
  }

  handleDragReleased(ev: CdkDragRelease): void {
    const prevEl = this._prevDragOverEl;
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this._prevDragOverEl = null;
    }

    const dropPoint = this._lastPointerPosition ?? this._extractDropPoint(ev.event);
    const cloneEl = this._dragCloneEl;
    if (cloneEl) {
      cloneEl.remove();
      this._dragCloneEl = null;
    }

    this._isDragging.set(false);
    const nativeEl = ev.source.element.nativeElement;
    nativeEl.style.pointerEvents = '';
    nativeEl.style.opacity = '1';

    this._dragPreviewContext.set(null);
    this._currentDragEvent.set(null);
    this._dragPreviewStyle.set(null);
    this._lastCalculatedTimestamp = null;

    // Delay resetting opacity and the dragging flag to allow smooth
    // animation back to the final position without visual jumps.
    window.setTimeout(() => {
      nativeEl.style.opacity = '';
      nativeEl.style.pointerEvents = '';
      this._isDraggingDelayed.set(false);
    }, 100);

    const { columnTarget, scheduleEventTarget } = this._resolveDropTargets(ev);
    const sourceEvent = ev.source.data;
    const task = this._pluckTaskFromEvent(sourceEvent);
    const sourceTaskId = nativeEl.id.replace(T_ID_PREFIX, '');
    const targetTaskId = scheduleEventTarget
      ? scheduleEventTarget.id.replace(T_ID_PREFIX, '')
      : '';
    const canMoveBefore =
      !!scheduleEventTarget &&
      sourceTaskId.length > 0 &&
      targetTaskId.length > 0 &&
      sourceTaskId !== targetTaskId;

    const dispatchMoveBefore = (taskToMove: TaskCopy): void => {
      this._store.dispatch(
        PlannerActions.moveBeforeTask({
          fromTask: taskToMove,
          toTaskId: targetTaskId,
        }),
      );
    };

    let handled = false;

    // Handle drop scenarios in priority order:
    // 1. Shift mode + hovering over another task → reorder
    if (task && this.isShiftMode() && canMoveBefore) {
      dispatchMoveBefore(task);
      handled = true;
    }

    // 2. Dropped on a column → schedule or plan for day
    if (!handled && columnTarget && task) {
      handled = this._handleColumnDrop({
        task,
        columnTarget,
        dropPoint,
      });
    }

    // 3. No column but hovering over another task → reorder as fallback
    if (!handled && task && canMoveBefore) {
      dispatchMoveBefore(task);
      handled = true;
    }

    // 4. Dropped outside grid → unschedule and plan for today
    if (!handled && task && dropPoint && this._isOutsideGrid(dropPoint)) {
      this._store.dispatch(TaskSharedActions.planTasksForToday({ taskIds: [task.id] }));
      handled = true;
    }

    this._resetDragCaches();
    nativeEl.style.transform = 'translate3d(0, 0, 0)';
    ev.source.reset();
  }

  refreshPreviewForCurrentPointer(): void {
    if (!this._isDragging()) {
      return;
    }
    const pointer = this._lastPointerPosition;
    if (!pointer) {
      return;
    }
    const gridContainer = this._gridContainer();
    if (!gridContainer) {
      return;
    }
    const gridRect = gridContainer.getBoundingClientRect();
    const targetDay = this._getDayUnderPointer(pointer.x, pointer.y);
    const targetEl =
      this._updatePointerCaches(pointer) ??
      this._lastDropCol ??
      this._lastDropScheduleEvent;
    const isWithinGrid = this._isWithinGrid(pointer, gridRect);

    if (this.isShiftMode()) {
      if (targetEl) {
        this._handleShiftDragMove(targetEl, pointer, gridRect, targetDay, isWithinGrid);
      } else {
        this._dragPreviewContext.set(null);
      }
    } else {
      this._handleTimeDragMove(pointer, gridRect, targetDay, isWithinGrid);
    }
  }

  private _gridContainer(): HTMLElement | null {
    if (!this._gridContainerAccessor) {
      return null;
    }
    try {
      return this._gridContainerAccessor();
    } catch {
      return null;
    }
  }

  private _daysToShow(): readonly string[] {
    if (!this._daysToShowAccessor) {
      return [];
    }
    try {
      // `daysToShow` is an Angular signal; invoking the accessor keeps us in sync.
      return this._daysToShowAccessor() ?? [];
    } catch {
      return [];
    }
  }

  private _clearShiftInfoTimeout(): void {
    if (this._shiftInfoTimeoutId) {
      window.clearTimeout(this._shiftInfoTimeoutId);
      this._shiftInfoTimeoutId = undefined;
    }
  }

  private _resetDragCaches(): void {
    this._lastDropCol = null;
    this._lastDropScheduleEvent = null;
    this._lastPointerPosition = null;
    this._lastCalculatedTimestamp = null;
    this._prevDragOverEl = null;
    this._dragCloneEl = null;
  }

  // Prevent treating drag preview elements as valid drop targets,
  // since they're just visual indicators and not actual schedule slots.
  private _isPreviewElement(element: Element | null): boolean {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    return (
      element.classList.contains(DRAG_CLONE_CLASS) ||
      element.classList.contains('custom-drag-preview') ||
      element.classList.contains('cdk-drag-preview') ||
      !!element.closest('.cdk-drag-preview')
    );
  }

  private _sanitizeScheduleEventTarget(target: HTMLElement | null): HTMLElement | null {
    if (!target || this._isPreviewElement(target)) {
      return null;
    }
    return target;
  }

  private _updatePointerCaches(pointer: PointerPosition): HTMLElement | null {
    // Cache drop targets during drag moves so we can reuse them on release
    // without expensive re-querying, especially when pointer hasn't moved.
    this._lastPointerPosition = pointer;
    const elementsAtPoint = document.elementsFromPoint(pointer.x, pointer.y);
    const interactiveElements = elementsAtPoint.filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !this._isPreviewElement(el),
    );

    if (interactiveElements.length) {
      this._lastDropCol =
        interactiveElements.find((el) => el.classList.contains('col')) || null;
      const scheduleEventCandidate =
        interactiveElements.find((el) => el.tagName.toLowerCase() === 'schedule-event') ||
        null;
      const sanitizedScheduleEvent =
        this._sanitizeScheduleEventTarget(scheduleEventCandidate);
      this._lastDropScheduleEvent = sanitizedScheduleEvent;
      const targetEl = sanitizedScheduleEvent ?? interactiveElements[0];
      return this._isPreviewElement(targetEl) ? null : targetEl;
    }

    const fallback = document.elementFromPoint(
      pointer.x,
      pointer.y,
    ) as HTMLElement | null;
    if (fallback && !this._isPreviewElement(fallback)) {
      return fallback;
    }
    return null;
  }

  private _handleShiftDragMove(
    targetEl: HTMLElement,
    pointer: PointerPosition,
    gridRect: DOMRect,
    targetDay: string,
    isWithinGrid: boolean,
  ): void {
    this._lastCalculatedTimestamp = null;

    if (isWithinGrid) {
      const timestamp = calculateTimeFromYPosition(pointer.y, gridRect, targetDay);
      if (timestamp) {
        this._createDragPreview(timestamp, targetDay, pointer.y, gridRect);
      }
      if (targetEl.classList.contains('col')) {
        this._dragPreviewContext.set({
          kind: 'shift',
          day: targetDay,
          isEndOfDay: targetEl.classList.contains('end-of-day'),
        });
      } else {
        this._dragPreviewContext.set(null);
      }
    } else {
      this._dragPreviewStyle.set(null);
      this._dragPreviewContext.set(null);
    }

    const prevEl = this._prevDragOverEl;
    if (prevEl && prevEl !== targetEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
    }
    if (prevEl !== targetEl) {
      this._prevDragOverEl = targetEl;
      if (
        targetEl.classList.contains(SVEType.Task) ||
        targetEl.classList.contains(SVEType.SplitTask) ||
        targetEl.classList.contains(SVEType.SplitTaskPlannedForDay) ||
        targetEl.classList.contains(SVEType.TaskPlannedForDay) ||
        targetEl.classList.contains('col')
      ) {
        targetEl.classList.add(DRAG_OVER_CLASS);
      }
    }
  }

  private _handleTimeDragMove(
    pointer: PointerPosition,
    gridRect: DOMRect,
    targetDay: string,
    isWithinGrid: boolean,
  ): void {
    const prevEl = this._prevDragOverEl;
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this._prevDragOverEl = null;
    }

    if (isWithinGrid) {
      const timestamp = calculateTimeFromYPosition(pointer.y, gridRect, targetDay);

      // Cache timestamp to avoid recalculating on drop if pointer didn't move.
      this._lastCalculatedTimestamp = timestamp;

      if (timestamp) {
        this._createDragPreview(timestamp, targetDay, pointer.y, gridRect);
        this._dragPreviewContext.set({ kind: 'time', timestamp });
      } else {
        this._dragPreviewContext.set(null);
      }
    } else {
      this._dragPreviewContext.set({ kind: 'override', label: 'UNSCHEDULE' });
      this._lastCalculatedTimestamp = null;
    }
  }

  private _isWithinGrid(pointer: PointerPosition, gridRect: DOMRect): boolean {
    return (
      pointer.y >= gridRect.top &&
      pointer.y <= gridRect.bottom &&
      pointer.x >= gridRect.left &&
      pointer.x <= gridRect.right
    );
  }

  private _createDragPreview(
    timestamp: number,
    targetDay: string,
    pointerY: number,
    gridRect: DOMRect,
  ): void {
    const relativeY = pointerY - gridRect.top;
    const totalRows = 24 * FH;
    const rowHeight = gridRect.height / totalRows;
    const row = Math.round(relativeY / rowHeight) + 1;

    const dayIndex = this._daysToShow().findIndex((day) => day === targetDay);
    const col = dayIndex + 2;

    const rowSpan = this._calculateRowSpan(this._currentDragEvent());

    const gridStyle = [
      `grid-row: ${row} / span ${rowSpan}`,
      `grid-column: ${col} / span 1`,
    ].join('; ');

    this._dragPreviewStyle.set(gridStyle);
  }

  // Calculate preview height based on task duration so users can see
  // how much space the task will occupy before dropping it.
  private _calculateRowSpan(event: ScheduleEvent | null): number {
    if (!event) {
      return 6;
    }
    const task = this._pluckTaskFromEvent(event);
    if (task?.timeEstimate) {
      const timeInHours = task.timeEstimate / (60 * 60 * 1000);
      return Math.max(Math.round(timeInHours * FH), 1);
    }
    return Math.max(Math.round(event.timeLeftInHours * FH), 1);
  }

  private _getDayUnderPointer(x: number, y: number): string {
    const elementsAtPoint = document.elementsFromPoint(x, y) as HTMLElement[];
    const colEl = elementsAtPoint.find(
      (el) => el?.classList?.contains('col') && el.hasAttribute('data-day'),
    ) as HTMLElement | undefined;
    if (colEl) {
      const day = colEl.getAttribute('data-day');
      if (day) {
        return day;
      }
    }

    const days = this._daysToShow();
    return days.length ? days[0] : '';
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

    scheduleEventTarget = this._sanitizeScheduleEventTarget(scheduleEventTarget);

    return { columnTarget, scheduleEventTarget };
  }

  private _calculateTimeFromDrop(
    dropPoint: PointerPosition,
    targetDay: string,
  ): number | null {
    const gridContainer = this._gridContainer();
    if (!gridContainer) {
      return null;
    }
    const gridRect = gridContainer.getBoundingClientRect();
    return calculateTimeFromYPosition(dropPoint.y, gridRect, targetDay);
  }

  private _isOutsideGrid(dropPoint: PointerPosition): boolean {
    const gridContainer = this._gridContainer();
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

  private _scheduleTask(task: TaskCopy, scheduleTime: number): void {
    const hasExistingSchedule = !!task?.dueWithTime;
    const hasReminder = !!task?.reminderId;
    // Smart reminder logic: if task is brand new to scheduling, add a reminder at start.
    // If it already has a reminder, update it. Otherwise, leave reminders unchanged.
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

    // Ensure task has a minimum duration so it's visible on the schedule.
    // Without this, zero-duration tasks would be invisible or hard to interact with.
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

  private _extractDropPoint(
    event: MouseEvent | TouchEvent | PointerEvent,
  ): PointerPosition | null {
    if ('clientX' in event) {
      return { x: event.clientX, y: event.clientY };
    }
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

  private _pluckTaskFromEvent(event: ScheduleEvent | null): TaskCopy | null {
    if (!event || !event.data) {
      return null;
    }

    switch (event.type) {
      case SVEType.Task:
      case SVEType.ScheduledTask:
      case SVEType.SplitTask:
      case SVEType.TaskPlannedForDay:
      case SVEType.SplitTaskPlannedForDay:
        return event.data as TaskCopy;
      default:
        return null;
    }
  }

  private _handleColumnDrop({
    task,
    columnTarget,
    dropPoint,
  }: {
    task: TaskCopy;
    columnTarget: HTMLElement;
    dropPoint: PointerPosition | null;
  }): boolean {
    const isMoveToEndOfDay = columnTarget.classList.contains('end-of-day');
    const targetDay =
      columnTarget.getAttribute('data-day') ||
      (dropPoint ? this._getDayUnderPointer(dropPoint.x, dropPoint.y) : null);

    if (!targetDay) {
      return false;
    }

    if (this.isShiftMode()) {
      this._store.dispatch(
        PlannerActions.planTaskForDay({
          task,
          day: targetDay,
          isAddToTop: !isMoveToEndOfDay,
        }),
      );
      return true;
    }

    // Reuse cached timestamp if available to avoid recalculating from pointer position.
    const scheduleTime =
      this._lastCalculatedTimestamp ??
      (dropPoint ? this._calculateTimeFromDrop(dropPoint, targetDay) : null);

    if (scheduleTime != null) {
      this._scheduleTask(task, scheduleTime);
      return true;
    }

    this._store.dispatch(
      PlannerActions.planTaskForDay({
        task,
        day: targetDay,
        isAddToTop: !isMoveToEndOfDay,
      }),
    );
    return true;
  }
}
