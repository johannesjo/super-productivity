import { CdkDragMove, CdkDragRelease, CdkDragStart } from '@angular/cdk/drag-drop';
import { WritableSignal } from '@angular/core';
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
import { TaskReminderOptionId } from '../../tasks/task.model';
import { calculateTimeFromYPosition } from '../schedule-utils';
import type { DragPreviewContext } from './schedule-week-drag.types';
import type { ScheduleEvent } from '../schedule.model';

interface PointerPosition {
  x: number;
  y: number;
}

export interface ScheduleWeekDragManagerDeps {
  readonly isTouchPrimary: boolean;
  readonly gridContainer: () => HTMLElement | null;
  readonly daysToShow: () => readonly string[];
  readonly isShiftMode: () => boolean;
  readonly dragPreviewContext: WritableSignal<DragPreviewContext>;
  readonly dragPreviewStyle: WritableSignal<string | null>;
  readonly dragPreviewPosition: WritableSignal<PointerPosition>;
  readonly currentDragEvent: WritableSignal<ScheduleEvent | null>;
  readonly prevDragOverEl: WritableSignal<HTMLElement | null>;
  readonly dragCloneEl: WritableSignal<HTMLElement | null>;
  readonly isDragging: WritableSignal<boolean>;
  readonly isDraggingDelayed: WritableSignal<boolean>;
  readonly showShiftKeyInfo: WritableSignal<boolean>;
  readonly store: Store;
}

const DRAG_CLONE_CLASS = 'drag-clone';
const DRAG_OVER_CLASS = 'drag-over';

export class ScheduleWeekDragManager {
  private readonly _isTouchPrimary = this._deps.isTouchPrimary;
  private readonly _gridContainerFn = this._deps.gridContainer;
  private readonly _daysToShowFn = this._deps.daysToShow;
  private readonly _isShiftModeFn = this._deps.isShiftMode;
  private readonly _dragPreviewContext = this._deps.dragPreviewContext;
  private readonly _dragPreviewStyle = this._deps.dragPreviewStyle;
  private readonly _dragPreviewPosition = this._deps.dragPreviewPosition;
  private readonly _currentDragEvent = this._deps.currentDragEvent;
  private readonly _prevDragOverEl = this._deps.prevDragOverEl;
  private readonly _dragCloneEl = this._deps.dragCloneEl;
  private readonly _isDragging = this._deps.isDragging;
  private readonly _isDraggingDelayed = this._deps.isDraggingDelayed;
  private readonly _showShiftKeyInfo = this._deps.showShiftKeyInfo;
  private readonly _store = this._deps.store;

  private _lastDropCol: HTMLElement | null = null;
  private _lastDropScheduleEvent: HTMLElement | null = null;
  private _lastPointerPosition: PointerPosition | null = null;
  private _lastCalculatedTimestamp: number | null = null;
  private _shiftInfoTimeoutId: number | undefined;

  constructor(private readonly _deps: ScheduleWeekDragManagerDeps) {}

  destroy(): void {
    if (this._shiftInfoTimeoutId) {
      window.clearTimeout(this._shiftInfoTimeoutId);
      this._shiftInfoTimeoutId = undefined;
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

    if (!this._isTouchPrimary) {
      this._showShiftKeyInfo.set(true);
      this._shiftInfoTimeoutId = window.setTimeout(() => {
        this._showShiftKeyInfo.set(false);
        this._shiftInfoTimeoutId = undefined;
      }, 3000);
    }

    const nativeEl = ev.source.element.nativeElement;
    nativeEl.style.opacity = '0';

    const cloneEl = this._dragCloneEl();
    if (cloneEl) {
      cloneEl.remove();
      this._dragCloneEl.set(null);
    }
  }

  handleDragMoved(ev: CdkDragMove<ScheduleEvent>): void {
    if (!this._isDragging()) {
      return;
    }

    ev.source.element.nativeElement.style.pointerEvents = 'none';
    const pointer = {
      x: ev.pointerPosition.x,
      y: ev.pointerPosition.y,
    } as PointerPosition;
    const targetEl = this._updatePointerCaches(pointer);
    if (!targetEl) {
      return;
    }

    this._dragPreviewPosition.set(pointer);

    const gridContainer = this._gridContainerFn();
    if (!gridContainer) {
      return;
    }

    const gridRect = gridContainer.getBoundingClientRect();
    const targetDay = this._getDayUnderPointer(pointer.x, pointer.y);
    const isWithinGrid = this._isWithinGrid(pointer, gridRect);

    if (this._isShiftModeFn()) {
      this._handleShiftDragMove(targetEl, pointer, gridRect, targetDay, isWithinGrid);
    } else {
      this._handleTimeDragMove(pointer, gridRect, targetDay, isWithinGrid);
    }
  }

  handleDragReleased(ev: CdkDragRelease): void {
    const prevEl = this._prevDragOverEl();
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this._prevDragOverEl.set(null);
    }

    const dropPoint = this._lastPointerPosition ?? this._extractDropPoint(ev.event);
    const cloneEl = this._dragCloneEl();
    if (cloneEl) {
      cloneEl.remove();
      this._dragCloneEl.set(null);
    }

    this._isDragging.set(false);
    const nativeEl = ev.source.element.nativeElement;
    nativeEl.style.pointerEvents = '';
    nativeEl.style.opacity = '1';

    this._dragPreviewContext.set(null);
    this._currentDragEvent.set(null);
    this._dragPreviewStyle.set(null);
    this._lastCalculatedTimestamp = null;

    window.setTimeout(() => {
      nativeEl.style.opacity = '';
      nativeEl.style.pointerEvents = '';
      this._isDraggingDelayed.set(false);
    }, 100);

    const { columnTarget, scheduleEventTarget } = this._resolveDropTargets(ev);
    const task = ev.source.data.data as any;
    const sourceTaskId = nativeEl.id.replace(T_ID_PREFIX, '');
    const targetTaskId = scheduleEventTarget
      ? scheduleEventTarget.id.replace(T_ID_PREFIX, '')
      : '';
    const canMoveBefore =
      !!scheduleEventTarget &&
      sourceTaskId.length > 0 &&
      targetTaskId.length > 0 &&
      sourceTaskId !== targetTaskId;

    const dispatchMoveBefore = (): void => {
      this._store.dispatch(
        PlannerActions.moveBeforeTask({
          fromTask: ev.source.data.data,
          toTaskId: targetTaskId,
        }),
      );
    };

    let handled = false;

    if (this._isShiftModeFn() && canMoveBefore) {
      dispatchMoveBefore();
      handled = true;
    }

    if (!handled && columnTarget && task) {
      const isMoveToEndOfDay = columnTarget.classList.contains('end-of-day');
      const targetDay =
        columnTarget.getAttribute('data-day') ||
        (dropPoint ? this._getDayUnderPointer(dropPoint.x, dropPoint.y) : null);

      if (targetDay) {
        handled = true;
        if (this._isShiftModeFn()) {
          this._store.dispatch(
            PlannerActions.planTaskForDay({
              task,
              day: targetDay,
              isAddToTop: !isMoveToEndOfDay,
            }),
          );
        } else {
          const scheduleTime =
            this._lastCalculatedTimestamp ??
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
    }

    if (!handled && canMoveBefore) {
      dispatchMoveBefore();
      handled = true;
    }

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
    const gridContainer = this._gridContainerFn();
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

    if (this._isShiftModeFn()) {
      if (targetEl) {
        this._handleShiftDragMove(targetEl, pointer, gridRect, targetDay, isWithinGrid);
      } else {
        this._dragPreviewContext.set(null);
      }
    } else {
      this._handleTimeDragMove(pointer, gridRect, targetDay, isWithinGrid);
    }
  }

  private _resetDragCaches(): void {
    this._lastDropCol = null;
    this._lastDropScheduleEvent = null;
    this._lastPointerPosition = null;
    this._lastCalculatedTimestamp = null;
  }

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

    const prevEl = this._prevDragOverEl();
    if (prevEl && prevEl !== targetEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
    }
    if (prevEl !== targetEl) {
      this._prevDragOverEl.set(targetEl);
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
    const prevEl = this._prevDragOverEl();
    if (prevEl) {
      prevEl.classList.remove(DRAG_OVER_CLASS);
      this._prevDragOverEl.set(null);
    }

    if (isWithinGrid) {
      const timestamp = calculateTimeFromYPosition(pointer.y, gridRect, targetDay);

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

    const dayIndex = this._daysToShowFn().findIndex((day) => day === targetDay);
    const col = dayIndex + 2;

    const rowSpan = this._calculateRowSpan(this._currentDragEvent());

    const gridStyle = [
      `grid-row: ${row} / span ${rowSpan}`,
      `grid-column: ${col} / span 1`,
    ].join('; ');

    this._dragPreviewStyle.set(gridStyle);
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

  private _getDayUnderPointer(x: number, y: number): string {
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

    const days = this._daysToShowFn();
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
    const gridContainer = this._gridContainerFn();
    if (!gridContainer) {
      return null;
    }
    const gridRect = gridContainer.getBoundingClientRect();
    return calculateTimeFromYPosition(dropPoint.y, gridRect, targetDay);
  }

  private _isOutsideGrid(dropPoint: PointerPosition): boolean {
    const gridContainer = this._gridContainerFn();
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
}
