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
  ) {
    let isDialogOpen = false;

    this._reminderService.onReminderActive$.subscribe(reminder => {
      if (!isDialogOpen && reminder && reminder.type === 'NOTE') {
        isDialogOpen = true;
        this._matDialog.open(DialogViewNoteReminderComponent, {
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
