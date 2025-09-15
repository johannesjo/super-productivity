import { inject, Injectable } from '@angular/core';
import { TaskFocusService } from './task-focus.service';
import { GlobalConfigService } from '../config/global-config.service';
import { checkKeyCombo } from '../../util/check-key-combo';
import { Log } from '../../core/log';

type TaskId = string;

// TODO get real method names from component
type TaskComponentMethod =
  | 'focusTitleForEdit'
  | 'toggleShowDetailPanel'
  | 'estimateTime'
  | 'scheduleTask'
  | 'toggleDoneKeyboard'
  | 'addSubTask'
  | 'addAttachment'
  | 'deleteTask'
  | 'openProjectMenu'
  | 'editTags'
  | 'openContextMenu'
  | 'moveToBacklog'
  | 'moveToToday'
  | 'focusPrevious'
  | 'focusNext'
  | 'collapseSubTasks'
  | 'expandSubTasks'
  | 'moveUp'
  | 'moveDown'
  | 'moveToTop'
  | 'moveToBottom'
  | 'focusSelf'
  | 'showAdditionalInfos';

@Injectable({
  providedIn: 'root',
})
/**
 * Service for handling global task keyboard shortcuts.
 * Delegates shortcut actions to the appropriate task component methods.
 */
export class TaskShortcutService {
  private readonly _taskFocusService = inject(TaskFocusService);
  private readonly _configService = inject(GlobalConfigService);

  /**
   * Handles task-specific keyboard shortcuts if a task is currently focused.
   *
   * @param ev - The keyboard event
   * @returns True if the shortcut was handled, false otherwise
   */
  handleTaskShortcuts(ev: KeyboardEvent): boolean {
    // Handle task-specific shortcuts if a task is focused
    const focusedTaskId: TaskId | null = this._taskFocusService.focusedTaskId();

    if (!focusedTaskId) return false;

    const cfg = this._configService.cfg();
    if (!cfg) return false;

    const keys = cfg.keyboard;
    const isShiftOrCtrlPressed = ev.shiftKey || ev.ctrlKey;

    // Basic task actions that work through component delegation
    if (checkKeyCombo(ev, keys.taskEditTitle) || ev.key === 'Enter') {
      this._handleTaskShortcut(focusedTaskId, 'focusTitleForEdit');
      ev.preventDefault();
      return true;
    }
    if (checkKeyCombo(ev, keys.taskToggleDetailPanelOpen)) {
      this._handleTaskShortcut(focusedTaskId, 'toggleShowDetailPanel');
      ev.preventDefault();
      return true;
    }
    if (checkKeyCombo(ev, keys.taskOpenEstimationDialog)) {
      this._handleTaskShortcut(focusedTaskId, 'estimateTime');
      ev.preventDefault();
      return true;
    }
    if (checkKeyCombo(ev, keys.taskSchedule)) {
      this._handleTaskShortcut(focusedTaskId, 'scheduleTask');
      ev.preventDefault();
      return true;
    }
    if (checkKeyCombo(ev, keys.taskToggleDone)) {
      this._handleTaskShortcut(focusedTaskId, 'toggleDoneKeyboard');
      ev.preventDefault();
      return true;
    }
    if (checkKeyCombo(ev, keys.taskAddSubTask)) {
      this._handleTaskShortcut(focusedTaskId, 'addSubTask');
      ev.preventDefault();
      return true;
    }
    if (checkKeyCombo(ev, keys.taskAddAttachment)) {
      this._handleTaskShortcut(focusedTaskId, 'addAttachment');
      ev.preventDefault();
      return true;
    }
    if (checkKeyCombo(ev, keys.taskDelete)) {
      this._handleTaskShortcut(focusedTaskId, 'deleteTask');
      ev.preventDefault();
      return true;
    }

    // Move to project / Open project menu
    if (checkKeyCombo(ev, keys.taskMoveToProject)) {
      this._handleTaskShortcut(focusedTaskId, 'openProjectMenu');
      ev.preventDefault();
      return true;
    }

    // Edit tags
    if (checkKeyCombo(ev, keys.taskEditTags)) {
      this._handleTaskShortcut(focusedTaskId, 'editTags');
      ev.preventDefault();
      return true;
    }

    // Toggle context menu
    if (checkKeyCombo(ev, keys.taskOpenContextMenu)) {
      this._handleTaskShortcut(focusedTaskId, 'openContextMenu', ev);
      ev.preventDefault();
      return true;
    }

    // Move to backlog/today (simplified)
    if (checkKeyCombo(ev, keys.moveToBacklog)) {
      this._handleTaskShortcut(focusedTaskId, 'moveToBacklog');
      ev.preventDefault();
      return true;
    }

    if (checkKeyCombo(ev, keys.moveToTodaysTasks)) {
      this._handleTaskShortcut(focusedTaskId, 'moveToToday');
      ev.preventDefault();
      return true;
    }

    // Navigation shortcuts
    if (
      (!isShiftOrCtrlPressed && ev.key === 'ArrowUp') ||
      checkKeyCombo(ev, keys.selectPreviousTask)
    ) {
      ev.preventDefault();
      this._handleTaskShortcut(focusedTaskId, 'focusPrevious');
      return true;
    }

    if (
      (!isShiftOrCtrlPressed && ev.key === 'ArrowDown') ||
      checkKeyCombo(ev, keys.selectNextTask)
    ) {
      ev.preventDefault();
      this._handleTaskShortcut(focusedTaskId, 'focusNext');
      return true;
    }

    // Arrow navigation for expand/collapse
    if (ev.key === 'ArrowLeft' || checkKeyCombo(ev, keys.collapseSubTasks)) {
      this._handleTaskShortcut(focusedTaskId, 'focusPrevious');
      ev.preventDefault();
      return true;
    }

    if (ev.key === 'ArrowRight' || checkKeyCombo(ev, keys.expandSubTasks)) {
      this._handleTaskShortcut(focusedTaskId, 'focusNext');
      ev.preventDefault();
      return true;
    }

    return false;
  }

  /**
   * Finds and calls a method on the task component for the given task ID.
   *
   * @param taskId - The ID of the task
   * @param method - The method name to call on the task component
   * @param args - Arguments to pass to the method
   */
  private _handleTaskShortcut(
    taskId: TaskId,
    method: TaskComponentMethod,
    ...args: unknown[]
  ): void {
    // Find the task component by taskId and call the specified method
    const taskElement = document.querySelector(`#t-${taskId}`) as HTMLElement | null;
    if (!taskElement) {
      Log.warn(`Task element not found for ID: t-${taskId}`);
      return;
    }

    const taskComponent = this._getTaskComponent(taskElement);
    if (!taskComponent) {
      Log.warn(`Task component not found for element:`, taskElement);
      return;
    }

    if (typeof taskComponent[method] === 'function') {
      (taskComponent[method] as (...args: unknown[]) => void)(...args);
      // TODO hide context menu if open
    } else {
      Log.warn(`Method ${method} not found on task component`, taskComponent);
    }
  }

  /**
   * Extracts the Angular component instance from a DOM element.
   *
   * @param taskElement - The DOM element containing the task component
   * @returns The task component instance or null if not found
   */
  private _getTaskComponent(taskElement: HTMLElement | null): unknown | null {
    if (!taskElement) return null;

    // Try the modern approach first
    if ((window as any).ng?.getComponent) {
      const component = (window as any).ng.getComponent(taskElement);
      if (component) return component;
    }

    // Fallback to the __ngContext__ approach
    if ((taskElement as any).__ngContext__) {
      const context = (taskElement as any).__ngContext__;
      for (let i = 0; i < context.length; i++) {
        const item = context[i];
        if (item && typeof item.task === 'function') {
          return item;
        }
      }
    }

    return null;
  }
}
