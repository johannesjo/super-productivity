import { Injectable } from '@angular/core';
import { ProjectService } from '../project/project.service';
import { PersistenceService } from '../core/persistence/persistence.service';
import { RecurringConfig, Reminder, ReminderType } from './reminder.model';
import { SnackService } from '../core/snack/snack.service';
import shortid from 'shortid';
import { NotifyService } from '../core/notify/notify.service';

const WORKER_PATH = 'assets/web-workers/reminder.js';

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private _w: Worker;
  private _reminders: Reminder[];

  constructor(
    private readonly _projectService: ProjectService,
    private readonly _persistenceService: PersistenceService,
    private readonly _notifyService: NotifyService,
    private readonly _snackService: SnackService,
  ) {
  }

  init() {
    if ('Worker' in window) {
      this._reminders = this._loadFromLs();
      this._w = new Worker(WORKER_PATH);
      // this._w.onerror = this._handleError.bind(this);
      this._w.addEventListener('message', this._onReminderActivated.bind(this));
      this._w.addEventListener('error', this._handleError.bind(this));
      this._updateRemindersInWorker(this._reminders);
    } else {
      console.error('No service workers supported :(');
    }
  }

  getById(reminderId: string) {
    return this._reminders.find(reminder => reminder.id === reminderId);
  }

  addReminder(type: ReminderType, relatedId: string, remindAt: number, recurringConfig?: RecurringConfig): string {
    const id = shortid();
    this._reminders.push({
      id,
      projectId: this._projectService.currentId,
      relatedId,
      remindAt,
      type,
      recurringConfig
    });
    // this._persistenceService
    this._updateRemindersInWorker(this._reminders);
    this._saveToLS(this._reminders);
    console.log(this._reminders);
    return id;
  }

  updateReminder(reminderId: string, reminderChanges: Partial<Reminder>) {
    this._saveToLS(this._reminders);
  }

  removeReminder(reminderIdToRemove: string) {
    const i = this._reminders.findIndex(reminder => reminder.id === reminderIdToRemove);
    if (i > -1) {
      this._reminders.splice(i, 1);
      this._saveToLS(this._reminders);
    } else {
      throw new Error('Unable to find reminder with id ' + reminderIdToRemove);
    }
  }

  markAsChecked(reminderId: string) {
  }

  private _onReminderActivated(msg: MessageEvent) {
    // console.log(msg);
    // TODO get related model here
    // console.log('ACTIVATE', msg.data);
    this._notifyService.notify({
      title: 'Title',
      body: 'body',
    });
  }

  private _loadFromLs(): Reminder[] {
    return this._persistenceService.loadReminders() || [];
  }

  private _saveToLS(reminders: Reminder[]) {
    this._persistenceService.saveReminders(reminders);
  }

  private _updateRemindersInWorker(reminders: Reminder[]) {
    this._w.postMessage(reminders);
  }

  private _handleError(err: any) {
    console.error(err);
    this._snackService.open({type: 'ERROR', message: 'Error for reminder interface'});
  }
}
