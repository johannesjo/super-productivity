import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReminderService} from './reminder.service';
import {NoteModule} from '../note/note.module';
import {MatDialog} from '@angular/material/dialog';
import {IS_ELECTRON} from '../../app.constants';
import {IPC} from '../../../../electron/ipc-events.const';
import {DialogViewNoteReminderComponent} from '../note/dialog-view-note-reminder/dialog-view-note-reminder.component';
import {TasksModule} from '../tasks/tasks.module';
import {DialogViewTaskReminderComponent} from '../tasks/dialog-view-task-reminder/dialog-view-task-reminder.component';
import {filter} from 'rxjs/operators';
import {Reminder} from './reminder.model';
import {ElectronService} from '../../core/electron/electron.service';

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
    private readonly _electronService: ElectronService,
  ) {
    _reminderService.init();
    this._reminderService.onReminderActive$.pipe(
      // NOTE: we simply filter for open dialogs, as reminders are re-queried quite often
      filter((reminder) => this._matDialog.openDialogs.length === 0 && !!reminder),
    ).subscribe((reminder: Reminder) => {
      if (IS_ELECTRON) {
        this._electronService.ipcRenderer.send(IPC.SHOW_OR_FOCUS);
      }

      if (reminder.type === 'NOTE') {
        this._matDialog.open(DialogViewNoteReminderComponent, {
          autoFocus: false,
          restoreFocus: true,
          data: {
            reminder,
          }
        });
      } else if (reminder.type === 'TASK') {
        this._matDialog.open(DialogViewTaskReminderComponent, {
          autoFocus: false,
          restoreFocus: true,
          data: {
            reminder,
          }
        }).afterClosed();
      }
    });
  }
}
