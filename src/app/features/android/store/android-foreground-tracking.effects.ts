import { inject, Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  distinctUntilChanged,
  filter,
  pairwise,
  startWith,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { androidInterface } from '../android-interface';
import { TaskService } from '../../tasks/task.service';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { DroidLog } from '../../../core/log';
import { DateService } from '../../../core/date/date.service';
import { Task } from '../../tasks/task.model';

@Injectable()
export class AndroidForegroundTrackingEffects {
  private _store = inject(Store);
  private _taskService = inject(TaskService);
  private _dateService = inject(DateService);

  /**
   * Start/stop the native foreground service when the current task changes.
   * Also handles syncing time when switching tasks directly.
   */
  syncTrackingToService$ =
    IS_ANDROID_WEB_VIEW &&
    createEffect(
      () =>
        this._store.select(selectCurrentTask).pipe(
          distinctUntilChanged((a, b) => a?.id === b?.id),
          startWith(null as Task | null),
          pairwise(),
          tap(([prevTask, currentTask]) => {
            // If switching from one task to another (or stopping), sync the previous task's time first
            if (prevTask) {
              this._syncElapsedTimeForTask(prevTask.id);
            }

            if (currentTask) {
              DroidLog.log('Starting tracking service', {
                taskId: currentTask.id,
                title: currentTask.title,
                timeSpent: currentTask.timeSpent,
              });
              androidInterface.startTrackingService?.(
                currentTask.id,
                currentTask.title,
                currentTask.timeSpent || 0,
              );
            } else {
              DroidLog.log('Stopping tracking service');
              androidInterface.stopTrackingService?.();
            }
          }),
        ),
      { dispatch: false },
    );

  /**
   * When the app resumes from background, sync the elapsed time from the native service.
   */
  syncOnResume$ =
    IS_ANDROID_WEB_VIEW &&
    createEffect(
      () =>
        androidInterface.onResume$.pipe(
          withLatestFrom(this._store.select(selectCurrentTask)),
          filter(([, currentTask]) => !!currentTask),
          tap(([, currentTask]) => {
            this._syncElapsedTimeForTask(currentTask!.id);
          }),
        ),
      { dispatch: false },
    );

  /**
   * Handle pause action from the notification.
   */
  handlePauseAction$ =
    IS_ANDROID_WEB_VIEW &&
    createEffect(
      () =>
        androidInterface.onPauseTracking$.pipe(
          withLatestFrom(this._store.select(selectCurrentTask)),
          filter(([, currentTask]) => !!currentTask),
          tap(([, currentTask]) => {
            DroidLog.log('Pause action from notification');
            // Sync elapsed time first, then pause
            this._syncElapsedTimeForTask(currentTask!.id);
            this._taskService.pauseCurrent();
          }),
        ),
      { dispatch: false },
    );

  /**
   * Handle done action from the notification.
   */
  handleDoneAction$ =
    IS_ANDROID_WEB_VIEW &&
    createEffect(
      () =>
        androidInterface.onMarkTaskDone$.pipe(
          withLatestFrom(this._store.select(selectCurrentTask)),
          filter(([, currentTask]) => !!currentTask),
          tap(([, currentTask]) => {
            DroidLog.log('Done action from notification', { taskId: currentTask!.id });
            // Sync elapsed time, mark as done, then pause
            this._syncElapsedTimeForTask(currentTask!.id);
            this._taskService.setDone(currentTask!.id);
            this._taskService.pauseCurrent();
          }),
        ),
      { dispatch: false },
    );

  /**
   * Sync elapsed time from native service to the task.
   * Only syncs if the native service is tracking the specified task.
   */
  private _syncElapsedTimeForTask(taskId: string): void {
    const elapsedJson = androidInterface.getTrackingElapsed?.();
    DroidLog.log('Syncing elapsed time for task', { taskId, elapsedJson });

    if (!elapsedJson || elapsedJson === 'null') {
      return;
    }

    try {
      const nativeData = JSON.parse(elapsedJson) as {
        taskId: string;
        elapsedMs: number;
      };

      // Only sync if native is tracking the same task
      if (nativeData.taskId !== taskId) {
        DroidLog.log('Native tracking different task, skipping sync', {
          nativeTaskId: nativeData.taskId,
          expectedTaskId: taskId,
        });
        return;
      }

      // Get the task to find its current timeSpent
      this._taskService
        .getByIdOnce$(taskId)
        .subscribe((task) => {
          if (!task) {
            DroidLog.log('Task not found for sync', { taskId });
            return;
          }

          const currentTimeSpent = task.timeSpent || 0;
          const duration = nativeData.elapsedMs - currentTimeSpent;

          DroidLog.log('Calculated sync duration', {
            taskId,
            nativeElapsed: nativeData.elapsedMs,
            currentTimeSpent,
            duration,
          });

          if (duration > 0) {
            this._taskService.addTimeSpent(task, duration, this._dateService.todayStr());
          }
        })
        .unsubscribe();
    } catch (e) {
      DroidLog.err('Failed to parse elapsed time', e);
    }
  }
}
