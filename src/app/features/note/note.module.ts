import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromNote from './store/note.reducer';
import { NOTE_FEATURE_NAME } from './store/note.reducer';
import { EffectsModule } from '@ngrx/effects';
import { NoteEffects } from './store/note.effects';
import { NotesComponent } from './notes/notes.component';
import { NoteComponent } from './note/note.component';
import { UiModule } from '../../ui/ui.module';
import { DialogAddNoteReminderComponent } from './dialog-add-note-reminder/dialog-add-note-reminder.component';
import { FormsModule } from '@angular/forms';
import { ReminderService } from '../reminder/reminder.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogViewNoteReminderComponent } from './dialog-view-note-reminder/dialog-view-note-reminder.component';
import { ElectronService } from 'ngx-electron';
import { IPC_SHOW_OR_FOCUS } from '../../../../electron/ipc-events.const';
import { IS_ELECTRON } from '../../app.constants';
import { DialogAddNoteComponent } from './dialog-add-note/dialog-add-note.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    StoreModule.forFeature(NOTE_FEATURE_NAME, fromNote.reducer),
    EffectsModule.forFeature([NoteEffects]),
  ],
  declarations: [
    NotesComponent,
    NoteComponent,
    DialogAddNoteReminderComponent,
    DialogViewNoteReminderComponent,
    DialogAddNoteComponent
  ],
  entryComponents: [
    DialogAddNoteReminderComponent,
    DialogViewNoteReminderComponent,
    DialogAddNoteComponent,
  ],
  exports: [NotesComponent],
})
export class NoteModule {}
