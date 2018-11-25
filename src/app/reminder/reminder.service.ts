import { Injectable } from '@angular/core';
import { ProjectService } from '../project/project.service';
import { PersistenceService } from '../core/persistence/persistence.service';
import { NoteService } from '../note/note.service';
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
    private readonly _noteService: NoteService,
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

  addReminder(type: ReminderType, relatedId: string, remindAt: number, recurringConfig?: RecurringConfig) {
    this._reminders.push({
      id: shortid(),
      projectId: this._projectService.currentId,
      relatedId,
      remindAt,
      type,
      recurringConfig
    });
    // this._persistenceService
    this._updateRemindersInWorker(this._reminders);
  }

  removeReminder(reminderIdToRemove: string) {
    const i = this._reminders.findIndex(reminder => reminder.id === reminderIdToRemove);
    if (i > -1) {
      this._reminders.splice(i, 1);
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
    // this._persistenceService.
    return [{
      id: shortid() as string,
      projectId: this._projectService.currentId,
      type: 'NOTE',
      relatedId: 'ASD',
      remindAt: Date.now() - 15000,
    }, {
      id: shortid() as string,
      projectId: this._projectService.currentId,
      type: 'NOTE',
      relatedId: 'aaaaa',
      remindAt: Date.now() - 13000,
    }, {
      id: shortid() as string,
      projectId: this._projectService.currentId,
      type: 'NOTE',
      relatedId: 'bvbdf',
      remindAt: Date.now() - 10001,
    }];
  }

  private _updateRemindersInWorker(reminders: Reminder[]) {
    this._w.postMessage(reminders);
  }

  private _handleError(err: any) {
    console.error(err);
    this._snackService.open({type: 'ERROR', message: 'Error for reminder interface'});
  }
}
