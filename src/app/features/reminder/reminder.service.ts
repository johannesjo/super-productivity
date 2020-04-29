import {Injectable} from '@angular/core';
import {ProjectService} from '../project/project.service';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {RecurringConfig, Reminder, ReminderCopy, ReminderType} from './reminder.model';
import {SnackService} from '../../core/snack/snack.service';
import shortid from 'shortid';
import {NotifyService} from '../../core/notify/notify.service';
import {BehaviorSubject, merge, Observable, ReplaySubject, Subject, timer} from 'rxjs';
import {throttle} from 'throttle-debounce';
import {dirtyDeepCopy} from '../../util/dirtyDeepCopy';
import {ImexMetaService} from '../../imex/imex-meta/imex-meta.service';
import {TaskService} from '../tasks/task.service';
import {Note} from '../note/note.model';
import {Task} from '../tasks/task.model';
import {NoteService} from '../note/note.service';
import {T} from '../../t.const';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {first, map, tap} from 'rxjs/operators';
import {migrateReminders} from './migrate-reminder.util';
import {WorkContextService} from '../work-context/work-context.service';
import {environment} from '../../../environments/environment';

const MAX_WAIT_FOR_INITIAL_SYNC = 20000;

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  onReminderActive$ = new Subject<Reminder>();

  private _reminders$ = new ReplaySubject<Reminder[]>(1);
  reminders$ = this._reminders$.asObservable();

  private _onReloadModel$ = new Subject<Reminder[]>();
  onReloadModel$ = this._onReloadModel$.asObservable();

  private _isRemindersLoaded$ = new BehaviorSubject<boolean>(false);
  isRemindersLoaded$: Observable<boolean> = this._isRemindersLoaded$.asObservable();

  private _w: Worker;
  private _reminders: Reminder[];
  private _throttledShowNotification = throttle(60000, this._showNotification.bind(this));

  constructor(
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
    private readonly _globalSyncService: GlobalSyncService,
    private readonly _persistenceService: PersistenceService,
    private readonly _notifyService: NotifyService,
    private readonly _snackService: SnackService,
    private readonly _taskService: TaskService,
    private readonly _noteService: NoteService,
    private readonly _imexMetaService: ImexMetaService,
  ) {
  }

  init() {
    if (typeof Worker !== 'undefined') {
      this._w = new Worker('./reminder.worker', {
        name: 'reminder',
        type: 'module'
      });

      // TODO we need a better solution for this
      // we do this to wait for syncing and the like
      merge(
        this._globalSyncService.afterInitialSyncDoneAndDataLoadedInitially$,
        timer(MAX_WAIT_FOR_INITIAL_SYNC),
      ).pipe(
        first(),
        tap((v) => console.log('IMP init Reminders', v)),
      ).subscribe(async () => {
        this._w.addEventListener('message', this._onReminderActivated.bind(this));
        this._w.addEventListener('error', this._handleError.bind(this));
        await this.reloadFromLs();
        this._isRemindersLoaded$.next(true);
      });

    } else {
      console.error('No service workers supported :(');
    }
  }

  async reloadFromLs() {
    this._reminders = await this._loadFromLs() || [];
    if (!Array.isArray(this._reminders)) {
      if (environment.production) {
        console.error('Something went wrong with the reminders', this._reminders);
        this._reminders = [];
      } else {
        console.log('this._reminders', this._reminders);
        throw new Error('Reminders are wrong');
      }
    }

    this._onReloadModel$.next(this._reminders);
    this._saveModel(this._reminders, true);
  }

  // TODO maybe refactor to observable, because models can differ to sync value for yet unknown reasons
  getById(reminderId: string): ReminderCopy {
    const _foundReminder = this._reminders && this._reminders.find(reminder => reminder.id === reminderId);
    return _foundReminder && dirtyDeepCopy(_foundReminder);
  }

  getById$(reminderId: string): Observable<ReminderCopy> {
    return this.reminders$.pipe(
      map(reminders => reminders.find(reminder => reminder.id === reminderId)),
    );
  }

  addReminder(type: ReminderType, relatedId: string, title: string, remindAt: number, recurringConfig?: RecurringConfig): string {
    const id = shortid();
    this._reminders.push({
      id,
      workContextId: this._workContextService.activeWorkContextId,
      workContextType: this._workContextService.activeWorkContextType,
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
      this._reminders[i] = Object.assign(this._reminders[i], reminderChanges);
    }
    this._saveModel(this._reminders);
  }

  removeReminder(reminderIdToRemove: string) {
    const i = this._reminders.findIndex(reminder => reminder.id === reminderIdToRemove);

    if (i > -1) {
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
    const reminder = msg.data as Reminder;

    const relatedModel = await this._getRelatedDataForReminder(reminder.relatedId, reminder.workContextId, reminder.type);
    console.log('RelatedModel for Reminder', relatedModel);

    // only show when not currently syncing and related model still exists
    if (!relatedModel) {
      console.warn('No Reminder Related Data found, removing reminder...');
      this.removeReminder(reminder.id);
    } else if (this._imexMetaService.isDataImportInProgress) {
      console.log('Reminder blocked because sync is in progress');
    } else {
      this.onReminderActive$.next(reminder);
      this._throttledShowNotification(reminder);
    }
  }

  private _showNotification(reminder: Reminder) {
    this._notifyService.notify({
      title: reminder.title,
      // prevents multiple notifications on mobile
      tag: reminder.id,
      requireInteraction: true,
    }).then();
  }

  private async _loadFromLs(): Promise<Reminder[]> {
    return migrateReminders(
      await this._persistenceService.reminders.loadState() || []
    );
  }

  private _saveModel(reminders: Reminder[], isSkipLastActive = false) {
    if (!isSkipLastActive) {
      this._persistenceService.saveLastActive();
    }
    this._persistenceService.reminders.saveState(reminders);
    this._updateRemindersInWorker(this._reminders);
    this._reminders$.next(this._reminders);
  }

  private _updateRemindersInWorker(reminders: Reminder[]) {
    this._w.postMessage(reminders);
  }

  private _handleError(err: any) {
    console.error(err);
    this._snackService.open({type: 'ERROR', msg: T.F.REMINDER.S_REMINDER_ERR});
  }

  private async _getRelatedDataForReminder(id: string, workContextId: string, type: ReminderType): Promise<Task | Note> {
    switch (type) {
      case 'NOTE':
        return await this._noteService.getByIdFromEverywhere(id, workContextId);
      case 'TASK':
        return await this._taskService.getByIdFromEverywhere(id);
    }
  }
}
