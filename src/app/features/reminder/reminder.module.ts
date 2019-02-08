import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReminderService } from './reminder.service';
import { NoteModule } from '../note/note.module';
import { MatDialog } from '@angular/material';
import { ElectronService } from 'ngx-electron';
import { IS_ELECTRON } from '../../app.constants';
import { IPC_SHOW_OR_FOCUS } from '../../../../electron/ipc-events.const';
import { DialogViewNoteReminderComponent } from '../note/dialog-view-note-reminder/dialog-view-note-reminder.component';
import { TasksModule } from '../tasks/tasks.module';

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

    let isDialogOpen = false;

    this._reminderService.onReminderActive$.subscribe(reminder => {
      if (IS_ELECTRON) {
        this._electronService.ipcRenderer.send(IPC_SHOW_OR_FOCUS);
      }

      if (!isDialogOpen && reminder) {
        if (reminder.type === 'NOTE') {
          isDialogOpen = true;
          this._matDialog.open(DialogViewNoteReminderComponent, {
            autoFocus: false,
            restoreFocus: true,
            data: {
              reminder: reminder,
            }
          }).afterClosed()
            .subscribe(() => {
              isDialogOpen = false;
            });
        } else if (reminder.type === 'TASK') {
          console.log('TASSK REMINDER OPNED!!!!');

        }
      }
    });
  }
}
