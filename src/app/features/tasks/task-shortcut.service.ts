import { inject, Injectable } from '@angular/core';
import { TaskService } from './task.service';
import { TaskFocusService } from './task-focus.service';
import { GlobalConfigService } from '../config/global-config.service';
import { checkKeyCombo } from '../../util/check-key-combo';

@Injectable({
  providedIn: 'root',
})
export class TaskShortcutService {
  private readonly _taskService = inject(TaskService);
  private readonly _taskFocusService = inject(TaskFocusService);
  private readonly _configService = inject(GlobalConfigService);

  handleTaskShortcuts(ev: KeyboardEvent): boolean {
    // Handle task-specific shortcuts if a task is focused
    const focusedTaskId = this._taskFocusService.focusedTaskId();
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

  private _handleTaskShortcut(taskId: string, method: string, ...args: any[]): void {
    // Find the task component by taskId and call the specified method
    const taskElement = document.querySelector(`#t-${taskId}`) as any;
    const taskComponent = this._getTaskComponent(taskElement);

    if (taskComponent && typeof taskComponent[method] === 'function') {
      taskComponent[method](...args);
    }
  }

  private _getTaskComponent(taskElement: any): any {
    return taskElement && (window as any).ng.getComponent(taskElement);
  }
}
