import { nanoid } from 'nanoid';
import { inject, Injectable } from '@angular/core';
import { RecurringConfig, Reminder, ReminderCopy, ReminderType } from './reminder.model';
import { SnackService } from '../../core/snack/snack.service';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { TaskService } from '../tasks/task.service';
import { Task } from '../tasks/task.model';
import { NoteService } from '../note/note.service';
import { T } from '../../t.const';
import { filter, map, skipUntil } from 'rxjs/operators';
import { migrateReminders } from './migrate-reminder.util';
import { devError } from '../../util/dev-error';
import { Note } from '../note/note.model';
import { environment } from 'src/environments/environment';
import { PfapiService } from '../../pfapi/pfapi.service';

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private readonly _pfapiService = inject(PfapiService);
  private readonly _snackService = inject(SnackService);
  private readonly _taskService = inject(TaskService);
  private readonly _noteService = inject(NoteService);
  private readonly _imexMetaService = inject(ImexViewService);

  private _onRemindersActive$: Subject<Reminder[]> = new Subject<Reminder[]>();
  onRemindersActive$: Observable<Reminder[]> = this._onRemindersActive$.pipe(
    skipUntil(
      this._imexMetaService.isDataImportInProgress$.pipe(
        filter((isInProgress) => !isInProgress),
      ),
    ),
  );

  private _reminders$: ReplaySubject<Reminder[]> = new ReplaySubject(1);
  reminders$: Observable<Reminder[]> = this._reminders$.asObservable();

  private _onReloadModel$: Subject<Reminder[]> = new Subject();
  onReloadModel$: Observable<Reminder[]> = this._onReloadModel$.asObservable();

  private _isRemindersLoaded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false,
  );
  isRemindersLoaded$: Observable<boolean> = this._isRemindersLoaded$.asObservable();

  private _w: Worker;
  private _reminders: Reminder[] = [];

  constructor() {
    // this._triggerPauseAfterUpdate$.subscribe((v) => console.log('_triggerPauseAfterUpdate$', v));
    // this._pauseAfterUpdate$.subscribe((v) => console.log('_pauseAfterUpdate$', v));
    // this._onRemindersActive$.subscribe((v) => console.log('_onRemindersActive$', v));
    // this.onRemindersActive$.subscribe((v) => console.log('onRemindersActive$', v));

    if (typeof (Worker as any) === 'undefined') {
      throw new Error('No service workers supported :(');
    }

    this._w = new Worker(new URL('./reminder.worker', import.meta.url), {
      name: 'reminder',
      type: 'module',
    });
  }

  async init(): Promise<void> {
    this._w.addEventListener('message', this._onReminderActivated.bind(this));
    this._w.addEventListener('error', this._handleError.bind(this));
    await this.reloadFromDatabase();
    this._isRemindersLoaded$.next(true);
  }

  async reloadFromDatabase(): Promise<void> {
    const fromDb = await this._loadFromDatabase();
    if (!fromDb || !Array.isArray(fromDb)) {
      this._saveModel([]);
    }
    this._reminders = await this._loadFromDatabase();
    if (!Array.isArray(this._reminders)) {
      console.log(this._reminders);
      devError('Something went wrong with the reminders');
      this._reminders = [];
    }

    this._updateRemindersInWorker(this._reminders);
    this._onReloadModel$.next(this._reminders);
    this._reminders$.next(this._reminders);
    if (environment.production) {
      console.log('loaded reminders from database', this._reminders);
    }
  }

  // TODO maybe refactor to observable, because models can differ to sync value for yet unknown reasons
  getById(reminderId: string): ReminderCopy | null {
    const _foundReminder =
      this._reminders && this._reminders.find((reminder) => reminder.id === reminderId);
    return !!_foundReminder ? dirtyDeepCopy<ReminderCopy>(_foundReminder) : null;
  }

  getById$(reminderId: string): Observable<ReminderCopy | null> {
    return this.reminders$.pipe(
      map(
        (reminders) => reminders.find((reminder) => reminder.id === reminderId) || null,
      ),
    );
  }

  getByRelatedId(relatedId: string): ReminderCopy | null {
    const _foundReminder =
      this._reminders &&
      this._reminders.find((reminder) => reminder.relatedId === relatedId);
    return !!_foundReminder ? dirtyDeepCopy<ReminderCopy>(_foundReminder) : null;
  }

  addReminder(
    type: ReminderType,
    relatedId: string,
    title: string,
    remindAt: number,
    recurringConfig?: RecurringConfig,
  ): string {
    // make sure that there is always only a single reminder with a particular relatedId as there might be race conditions
    this.removeReminderByRelatedIdIfSet(relatedId);

    const id = nanoid();
    const existingInstanceForEntry = this.getByRelatedId(relatedId);
    if (existingInstanceForEntry) {
      devError('A reminder for this ' + type + ' already exists');
      this.updateReminder(existingInstanceForEntry.id, {
        relatedId,
        title,
        remindAt,
        type,
        recurringConfig,
      });
      return existingInstanceForEntry.id;
    } else {
      // TODO find out why we need to do this
      this._reminders = dirtyDeepCopy(this._reminders);
      this._reminders.push({
        id,
        relatedId,
        title,
        remindAt,
        type,
        recurringConfig,
      });
      this._saveModel(this._reminders);
      return id;
    }
  }

  snooze(reminderId: string, snoozeTime: number): void {
    const remindAt = new Date().getTime() + snoozeTime;
    this.updateReminder(reminderId, { remindAt });
  }

  updateReminder(reminderId: string, reminderChanges: Partial<Reminder>): void {
    const i = this._reminders.findIndex((reminder) => reminder.id === reminderId);
    if (i > -1) {
      // TODO find out why we need to do this
      this._reminders = dirtyDeepCopy(this._reminders);
      this._reminders[i] = Object.assign({}, this._reminders[i], reminderChanges);
    }
    this._saveModel(this._reminders);
  }

  removeReminder(reminderIdToRemove: string): void {
    const i = this._reminders.findIndex((reminder) => reminder.id === reminderIdToRemove);

    if (i > -1) {
      // TODO find out why we need to do this
      this._reminders = dirtyDeepCopy(this._reminders);
      this._reminders.splice(i, 1);
      this._saveModel(this._reminders);
    } else {
      // throw new Error('Unable to find reminder with id ' + reminderIdToRemove);
    }
  }

  removeReminderByRelatedIdIfSet(relatedId: string): void {
    const reminder = this._reminders.find(
      (reminderIN) => reminderIN.relatedId === relatedId,
    );
    if (reminder) {
      this.removeReminder(reminder.id);
    }
  }

  removeRemindersByRelatedIds(relatedIds: string[]): void {
    const reminders = this._reminders.filter((reminderIN) =>
      relatedIds.includes(reminderIN.relatedId),
    );
    if (reminders && reminders.length) {
      reminders.forEach((reminder) => {
        this.removeReminder(reminder.id);
      });
    }
  }

  private async _onReminderActivated(msg: MessageEvent): Promise<void> {
    const reminders = msg.data as Reminder[];
    const remindersWithData: Reminder[] = (await Promise.all(
      reminders.map(async (reminder) => {
        const relatedModel = await this._getRelatedDataForReminder(reminder);
        // console.log('RelatedModel for Reminder', relatedModel);
        // only show when not currently syncing and related model still exists
        if (!relatedModel) {
          devError('No Reminder Related Data found, removing reminder...');
          this.removeReminder(reminder.id);
          return null;
        } else {
          return reminder;
        }
      }),
    )) as Reminder[];
    const finalReminders = remindersWithData.filter((reminder) => !!reminder);

    if (finalReminders.length > 0) {
      this._onRemindersActive$.next(finalReminders);
    }
  }

  private async _loadFromDatabase(): Promise<Reminder[]> {
    return migrateReminders((await this._pfapiService.m.reminders.load()) || []);
  }

  private async _saveModel(reminders: Reminder[]): Promise<void> {
    if (!this._isRemindersLoaded$.getValue()) {
      throw new Error('Reminders not loaded initially when trying to save model');
    }
    console.log('saveReminders', reminders);
    await this._pfapiService.m.reminders.save(reminders, {
      isUpdateRevAndLastUpdate: true,
    });
    this._updateRemindersInWorker(this._reminders);
    this._reminders$.next(this._reminders);
  }

  private _updateRemindersInWorker(reminders: Reminder[]): void {
    this._w.postMessage(reminders);
  }

  private _handleError(err: any): void {
    console.error(err);
    this._snackService.open({ type: 'ERROR', msg: T.F.REMINDER.S_REMINDER_ERR });
  }

  private async _getRelatedDataForReminder(reminder: Reminder): Promise<Task | Note> {
    switch (reminder.type) {
      case 'NOTE':
        return await this._noteService.getByIdOnce$(reminder.relatedId).toPromise();
      case 'TASK':
        // NOTE: remember we don't want archive tasks to pop up here
        return await this._taskService.getByIdOnce$(reminder.relatedId).toPromise();
    }

    throw new Error('Cannot get related model for reminder');
  }
}
