import { inject, Injectable } from '@angular/core';
import { SnackService } from '../../core/snack/snack.service';
import { Observable, Subject } from 'rxjs';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { T } from '../../t.const';
import { filter, map, skipUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Log } from '../../core/log';
import { GlobalConfigService } from '../config/global-config.service';
import { Store } from '@ngrx/store';
import { selectAllTasksWithReminder } from '../tasks/store/task.selectors';
import { TaskWithReminder, TaskWithReminderData } from '../tasks/task.model';

interface WorkerReminder {
  id: string;
  remindAt: number;
  title: string;
  type: 'TASK';
}

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private readonly _snackService = inject(SnackService);
  private readonly _imexMetaService = inject(ImexViewService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _store = inject(Store);

  private _onRemindersActive$: Subject<TaskWithReminderData[]> = new Subject<
    TaskWithReminderData[]
  >();
  onRemindersActive$: Observable<TaskWithReminderData[]> = this._onRemindersActive$.pipe(
    skipUntil(
      this._imexMetaService.isDataImportInProgress$.pipe(
        filter((isInProgress) => !isInProgress),
      ),
    ),
  );

  private _w: Worker;

  constructor() {
    if (typeof (Worker as unknown) === 'undefined') {
      throw new Error('No service workers supported :(');
    }

    this._w = new Worker(new URL('./reminder.worker', import.meta.url), {
      name: 'reminder',
      type: 'module',
    });
  }

  init(): void {
    this._w.addEventListener('message', this._onReminderActivated.bind(this));
    this._w.addEventListener('error', this._handleError.bind(this));

    // Subscribe to tasks with reminders and update worker whenever they change
    this._store
      .select(selectAllTasksWithReminder)
      .pipe(map((tasks) => this._mapTasksToWorkerReminders(tasks)))
      .subscribe((reminders) => {
        this._updateRemindersInWorker(reminders);
        if (!environment.production) {
          Log.log('Updated reminders in worker', reminders);
        }
      });
  }

  private _mapTasksToWorkerReminders(tasks: TaskWithReminder[]): WorkerReminder[] {
    return tasks.map((task) => ({
      id: task.id,
      remindAt: task.remindAt,
      title: task.title,
      type: 'TASK' as const,
    }));
  }

  private _onReminderActivated(msg: MessageEvent): void {
    const reminders = msg.data as WorkerReminder[];
    Log.log(`ReminderService: Worker activated ${reminders.length} reminder(s)`);

    if (this._globalConfigService.cfg()?.reminder?.disableReminders) {
      Log.log('ReminderService: reminders are disabled, not sending to UI');
      return;
    }

    // Map worker reminders back to TaskWithReminderData format
    const taskReminders: TaskWithReminderData[] = reminders.map((r) => ({
      id: r.id,
      title: r.title,
      reminderData: { remindAt: r.remindAt },
      // These fields will be populated by the component that consumes this
      // by looking up the full task from the store
    })) as TaskWithReminderData[];

    Log.log(`ReminderService: ${taskReminders.length} valid reminder(s) to show`);
    if (taskReminders.length > 0) {
      this._onRemindersActive$.next(taskReminders);
    }
  }

  private _updateRemindersInWorker(reminders: WorkerReminder[]): void {
    this._w.postMessage(reminders);
  }

  private _handleError(err: unknown): void {
    Log.err(err);
    this._snackService.open({ type: 'ERROR', msg: T.F.REMINDER.S_REMINDER_ERR });
  }
}
