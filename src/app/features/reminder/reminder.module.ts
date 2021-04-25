import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReminderService } from './reminder.service';
import { NoteModule } from '../note/note.module';
import { MatDialog } from '@angular/material/dialog';
import { IS_ELECTRON } from '../../app.constants';
import { TasksModule } from '../tasks/tasks.module';
import { concatMap, delay, filter, first } from 'rxjs/operators';
import { Reminder } from './reminder.model';
import { UiHelperService } from '../ui-helper/ui-helper.service';
import { NotifyService } from '../../core/notify/notify.service';
import { DialogViewTaskRemindersComponent } from '../tasks/dialog-view-task-reminders/dialog-view-task-reminders.component';
import { DataInitService } from '../../core/data-init/data-init.service';
import { throttle } from 'helpful-decorators';
import { SyncService } from '../../imex/sync/sync.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    NoteModule,
    TasksModule,
  ],
})
export class ReminderModule {
  constructor(
    private readonly _reminderService: ReminderService,
    private readonly _matDialog: MatDialog,
    private readonly _uiHelperService: UiHelperService,
    private readonly _notifyService: NotifyService,
    private readonly _dataInitService: DataInitService,
    private readonly _syncService: SyncService,
  ) {

    this._dataInitService.isAllDataLoadedInitially$.pipe(concatMap(() =>

      // we do this to wait for syncing and the like
      this._syncService.afterInitialSyncDoneAndDataLoadedInitially$.pipe(
        first(),
        delay(1000),
      )))
      .subscribe(async () => {
        _reminderService.init();
      });

    this._reminderService.onRemindersActive$.pipe(
      // NOTE: we simply filter for open dialogs, as reminders are re-queried quite often
      filter((reminder) => this._matDialog.openDialogs.length === 0 && !!reminder && reminder.length > 0),
    ).subscribe((reminders: Reminder[]) => {

      if (IS_ELECTRON) {
        this._uiHelperService.focusApp();
      }

      this._showNotification(reminders);

      const oldest = reminders[0];
      if (oldest.type === 'TASK') {
        this._matDialog.open(DialogViewTaskRemindersComponent, {
          autoFocus: false,
          restoreFocus: true,
          data: {
            reminders,
          }
        }).afterClosed();
      }
    });
  }

  @throttle(60000)
  private _showNotification(reminders: Reminder[]) {
    const isMultiple = reminders.length > 1;
    const title = isMultiple
      ? '"' + reminders[0].title + '" and ' + (reminders.length - 1) + ' other tasks are due.'
      : reminders[0].title;
    const tag = reminders.reduce((acc, reminder) => acc + '_' + reminder.id, '');

    this._notifyService.notify({
      title,
      // prevents multiple notifications on mobile
      tag,
      requireInteraction: true,
    }).then();
  }

}
