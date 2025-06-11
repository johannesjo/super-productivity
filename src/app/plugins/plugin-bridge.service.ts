import { inject, Injectable } from '@angular/core';
import { SnackService } from '../core/snack/snack.service';
import { NotifyService } from '../core/notify/notify.service';
import { DialogCfg, NotifyCfg, SnackCfgLimited, TaskCopy } from './plugin-api.model';

/**
 * PluginBridge acts as an intermediary layer between plugins and the main application services.
 * This provides:
 * - Clean separation of concerns
 * - Controlled access to app functionality
 * - Easy testing and mocking
 * - Centralized plugin-to-app communication
 */
@Injectable({
  providedIn: 'root',
})
export class PluginBridgeService {
  private _snackService = inject(SnackService);
  private _notifyService = inject(NotifyService);

  constructor() {}

  /**
   * Show a snack message to the user
   */
  showSnack(snackCfg: SnackCfgLimited): void {
    this._snackService.open(snackCfg);
  }

  /**
   * Show a notification to the user
   */
  notify(notifyCfg: NotifyCfg): void {
    if ('Notification' in window) {
      // Use browser notifications
      if (Notification.permission === 'granted') {
        new Notification(notifyCfg.title, {
          body: notifyCfg.body,
          icon: notifyCfg.icon,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(notifyCfg.title, {
              body: notifyCfg.body,
              icon: notifyCfg.icon,
            });
          }
        });
      }
    } else {
      // Fallback to snack message if notifications aren't supported
      this.showSnack({
        msg: `${notifyCfg.title}: ${notifyCfg.body}`,
        type: 'CUSTOM',
      });
    }
  }

  /**
   * Open a dialog
   */
  async openDialog(dialogCfg: DialogCfg): Promise<void> {
    // For now, use a simple browser dialog
    // TODO: Integrate with Angular Material Dialog or custom dialog service
    if (dialogCfg.htmlContent) {
      // Strip HTML for simple text display
      const textContent = dialogCfg.htmlContent.replace(/<[^>]*>/g, '');
      alert(textContent);
    }

    // Execute button actions if provided
    if (dialogCfg.buttons && dialogCfg.buttons.length > 0) {
      const firstButton = dialogCfg.buttons[0];
      if (firstButton.onClick) {
        await firstButton.onClick();
      }
    }
  }

  /**
   * Get all tasks (placeholder implementation)
   */
  async getAllTasks(): Promise<TaskCopy[]> {
    // TODO: Integrate with TaskService
    console.log('PluginBridge: getAllTasks called');
    return [];
  }

  /**
   * Get archived tasks (placeholder implementation)
   */
  async getArchivedTasks(): Promise<TaskCopy[]> {
    // TODO: Integrate with TaskArchiveService
    console.log('PluginBridge: getArchivedTasks called');
    return [];
  }

  /**
   * Get current context tasks (placeholder implementation)
   */
  async getCurrentContextTasks(): Promise<TaskCopy[]> {
    // TODO: Integrate with WorkContextService and TaskService
    console.log('PluginBridge: getCurrentContextTasks called');
    return [];
  }

  /**
   * Update a task (placeholder implementation)
   */
  async updateTask(taskId: string, updates: Partial<TaskCopy>): Promise<void> {
    // TODO: Integrate with TaskService
    console.log('PluginBridge: updateTask called', { taskId, updates });
  }

  /**
   * Persist plugin data (placeholder implementation)
   */
  persistDataSynced(dataStr: string): void {
    // TODO: Integrate with persistence service
    console.log('PluginBridge: persistDataSynced called', dataStr);

    // For now, store in localStorage with a plugin prefix
    try {
      localStorage.setItem('plugin-data', dataStr);
    } catch (error) {
      console.error('Failed to persist plugin data:', error);
    }
  }

  /**
   * Get persisted plugin data (placeholder implementation)
   */
  getPersistedData(): string | null {
    try {
      return localStorage.getItem('plugin-data');
    } catch (error) {
      console.error('Failed to get persisted plugin data:', error);
      return null;
    }
  }

  /**
   * Add action to execute before app close (placeholder implementation)
   */
  addActionBeforeCloseApp(action: () => Promise<void>): void {
    // TODO: Integrate with app lifecycle service
    console.log('PluginBridge: addActionBeforeCloseApp called', action);
  }

  /**
   * Get configuration for plugins (placeholder implementation)
   */
  async getCfg<T>(): Promise<T> {
    // TODO: Integrate with GlobalConfigService
    console.log('PluginBridge: getCfg called');
    return {} as T;
  }
}
