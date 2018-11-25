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

@NgModule({
  declarations: [
    NotesComponent,
    NoteComponent,
    DialogAddNoteReminderComponent
  ],
  imports: [
    ReminderModule,
    CommonModule,
    UiModule,
    StoreModule.forFeature(NOTE_FEATURE_NAME, fromNote.reducer),
    EffectsModule.forFeature([NoteEffects]),
  ],
  entryComponents: [
    DialogAddNoteReminderComponent
  ],
  exports: [NotesComponent],
  providers: [NoteService]
})
export class NoteModule {
}
