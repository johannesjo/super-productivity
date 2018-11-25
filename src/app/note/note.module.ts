import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromNote from './store/note.reducer';
import { NOTE_FEATURE_NAME } from './store/note.reducer';
import { EffectsModule } from '@ngrx/effects';
import { NoteEffects } from './store/note.effects';
import { NotesComponent } from './notes/notes.component';
import { NoteComponent } from './note/note.component';
import { UiModule } from '../ui/ui.module';
import { NoteService } from './note.service';
import { DialogAddNoteReminderComponent } from './dialog-add-note-reminder/dialog-add-note-reminder.component';
import { ReminderModule } from '../reminder/reminder.module';
import { FormsModule } from '@angular/forms';
import { ReminderService } from '../reminder/reminder.service';
import { MatDialog } from '@angular/material';
import { DialogViewNoteReminderComponent } from './dialog-view-note-reminder/dialog-view-note-reminder.component';
import { ElectronService } from 'ngx-electron';
import { IPC_SHOW_OR_FOCUS } from '../../ipc-events.const';
import { IS_ELECTRON } from '../app.constants';

@NgModule({
  declarations: [
    NotesComponent,
    NoteComponent,
    DialogAddNoteReminderComponent,
    DialogViewNoteReminderComponent
  ],
  imports: [
    ReminderModule,
    CommonModule,
    FormsModule,
    UiModule,
    StoreModule.forFeature(NOTE_FEATURE_NAME, fromNote.reducer),
    EffectsModule.forFeature([NoteEffects]),
  ],
  entryComponents: [
    DialogAddNoteReminderComponent,
    DialogViewNoteReminderComponent,
  ],
  exports: [NotesComponent],
  providers: [NoteService]
})
export class NoteModule {
  constructor(
    private readonly _reminderService: ReminderService,
    private readonly _matDialog: MatDialog,
    private readonly _electronService: ElectronService,
  ) {
    let isDialogOpen = false;

    this._reminderService.onReminderActive$.subscribe(reminder => {
      if (IS_ELECTRON) {
        this._electronService.ipcRenderer.send(IPC_SHOW_OR_FOCUS);
      }

      if (!isDialogOpen && reminder && reminder.type === 'NOTE') {
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
      }
    });
  }
}
