import { Injectable } from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { RecurringConfig, Reminder, ReminderCopy, ReminderType } from './reminder.model';
import { SnackService } from '../../core/snack/snack.service';
import * as shortid from 'shortid';
import { BehaviorSubject, merge, Observable, ReplaySubject, Subject, timer } from 'rxjs';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { ImexMetaService } from '../../imex/imex-meta/imex-meta.service';
import { TaskService } from '../tasks/task.service';
import { Note } from '../note/note.model';
import { Task } from '../tasks/task.model';
import { NoteService } from '../note/note.service';
import { T } from '../../t.const';
import { SyncService } from '../../imex/sync/sync.service';
import { filter, first, map, skipUntil } from 'rxjs/operators';
import { migrateReminders } from './migrate-reminder.util';
import { WorkContextService } from '../work-context/work-context.service';
import { devError } from '../../util/dev-error';
import { WorkContextType } from '../work-context/work-context.model';

const MAX_WAIT_FOR_INITIAL_SYNC = 25000;

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private _onRemindersActive$: Subject<Reminder[]> = new Subject<Reminder[]>();
  onRemindersActive$: Observable<Reminder[]> = this._onRemindersActive$.pipe(
    skipUntil(this._imexMetaService.isDataImportInProgress$.pipe(
      filter(isInProgress => !isInProgress),
    )),
  );

  private _reminders$: ReplaySubject<Reminder[]> = new ReplaySubject(1);
  reminders$: Observable<Reminder[]> = this._reminders$.asObservable();

  private _onReloadModel$: Subject<Reminder[]> = new Subject();
  onReloadModel$: Observable<Reminder[]> = this._onReloadModel$.asObservable();

  private _isRemindersLoaded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isRemindersLoaded$: Observable<boolean> = this._isRemindersLoaded$.asObservable();

  private _w: Worker;
  private _reminders: Reminder[] = [];

  constructor(
    private readonly _workContextService: WorkContextService,
    private readonly _syncService: SyncService,
    private readonly _persistenceService: PersistenceService,
    private readonly _snackService: SnackService,
    private readonly _taskService: TaskService,
    private readonly _noteService: NoteService,
    private readonly _imexMetaService: ImexMetaService,
  ) {
    // this._triggerPauseAfterUpdate$.subscribe((v) => console.log('_triggerPauseAfterUpdate$', v));
    // this._pauseAfterUpdate$.subscribe((v) => console.log('_pauseAfterUpdate$', v));
    // this._onRemindersActive$.subscribe((v) => console.log('_onRemindersActive$', v));
    // this.onRemindersActive$.subscribe((v) => console.log('onRemindersActive$', v));

    if (typeof (Worker as any) === 'undefined') {
      throw new Error('No service workers supported :(');
    }

    this._w = new Worker('./reminder.worker', {
      name: 'reminder',
      type: 'module'
    });
  }

  init() {
    // we do this to wait for syncing and the like
    merge(
      this._syncService.afterInitialSyncDoneAndDataLoadedInitially$,
      timer(MAX_WAIT_FOR_INITIAL_SYNC),
    ).pipe(
      first(),
    ).subscribe(async () => {
      this._w.addEventListener('message', this._onReminderActivated.bind(this));
      this._w.addEventListener('error', this._handleError.bind(this));
      await this.reloadFromDatabase();
      this._isRemindersLoaded$.next(true);
    });
  }

  async reloadFromDatabase() {
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
  }

  // TODO maybe refactor to observable, because models can differ to sync value for yet unknown reasons
  getById(reminderId: string): ReminderCopy | null {
    const _foundReminder = this._reminders && this._reminders.find(reminder => reminder.id === reminderId);
    return !!_foundReminder
      ? dirtyDeepCopy<ReminderCopy>(_foundReminder)
      : null;
  }

  getById$(reminderId: string): Observable<ReminderCopy | null> {
    return this.reminders$.pipe(
      map(reminders => reminders.find(reminder => reminder.id === reminderId) || null),
    );
  }

  getByRelatedId(relatedId: string): ReminderCopy | null {
    const _foundReminder = this._reminders && this._reminders.find(reminder => reminder.relatedId === relatedId);
    return !!_foundReminder
      ? dirtyDeepCopy<ReminderCopy>(_foundReminder)
      : null;
  }

  addReminder(type: ReminderType, relatedId: string, title: string, remindAt: number, recurringConfig?: RecurringConfig): string {
    const id = shortid();
    if (this.getByRelatedId(relatedId)) {
      throw new Error('A reminder for this ' + type + ' already exists');
    }

    // TODO find out why we need to do this
    this._reminders = dirtyDeepCopy(this._reminders);
    this._reminders.push({
      id,
      workContextId: this._workContextService.activeWorkContextId as string,
      workContextType: this._workContextService.activeWorkContextType as WorkContextType,
      relatedId,
      title,
      remindAt,
      type,
      recurringConfig
    });
    this._saveModel(this._reminders);
    return id;
  }

  snooze(reminderId: string, snoozeTime: number) {
    const remindAt = new Date().getTime() + snoozeTime;
    this.updateReminder(reminderId, {remindAt});
  }

  updateReminder(reminderId: string, reminderChanges: Partial<Reminder>) {
    const i = this._reminders.findIndex(reminder => reminder.id === reminderId);
    if (i > -1) {
      // TODO find out why we need to do this
      this._reminders = dirtyDeepCopy(this._reminders);
      this._reminders[i] = Object.assign({}, this._reminders[i], reminderChanges);
    }
    this._saveModel(this._reminders);
  }

  removeReminder(reminderIdToRemove: string) {
    const i = this._reminders.findIndex(reminder => reminder.id === reminderIdToRemove);

    if (i > -1) {
      // TODO find out why we need to do this
      this._reminders = dirtyDeepCopy(this._reminders);
      this._reminders.splice(i, 1);
      this._saveModel(this._reminders);
    } else {
      // throw new Error('Unable to find reminder with id ' + reminderIdToRemove);
    }
  }

  removeReminderByRelatedIdIfSet(relatedId: string) {
    const reminder = this._reminders.find(reminderIN => reminderIN.relatedId === relatedId);
    if (reminder) {
      this.removeReminder(reminder.id);
    }
  }

  removeRemindersByWorkContextId(workContextId: string) {
    const reminders = this._reminders.filter(reminderIN => reminderIN.workContextId === workContextId);
    if (reminders && reminders.length) {
      reminders.forEach(reminder => {
        this.removeReminder(reminder.id);
      });
    }
  }

  private async _onReminderActivated(msg: MessageEvent) {
    const reminders = msg.data as Reminder[];
    const remindersWithData: Reminder[] = await Promise.all(reminders.map(async (reminder) => {
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
    })) as Reminder [];
    const finalReminders = remindersWithData.filter(reminder => !!reminder);

    if (finalReminders.length > 0) {
      this._onRemindersActive$.next(finalReminders);
    }
  }

  private async _loadFromDatabase(): Promise<Reminder[]> {
    return migrateReminders(
      await this._persistenceService.reminders.loadState() || []
    );
  }

  private _saveModel(reminders: Reminder[]) {
    this._updateRemindersInWorker(this._reminders);
    this._persistenceService.reminders.saveState(reminders, {isSyncModelChange: true});
    this._reminders$.next(this._reminders);
  }

  private _updateRemindersInWorker(reminders: Reminder[]) {
    this._w.postMessage(reminders);
  }

  private _handleError(err: any) {
    console.error(err);
    this._snackService.open({type: 'ERROR', msg: T.F.REMINDER.S_REMINDER_ERR});
  }

  private async _getRelatedDataForReminder(reminder: Reminder): Promise<Task | Note> {
    switch (reminder.type) {
      case 'NOTE':
        return await this._noteService.getByIdFromEverywhere(reminder.relatedId, reminder.workContextId);
      case 'TASK':
        // NOTE: remember we don't want archive tasks to pop up here
        return await this._taskService.getByIdOnce$(reminder.relatedId).toPromise();
    }
  }
}
