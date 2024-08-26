import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { NOTE_FEATURE_NAME, noteReducer } from './store/note.reducer';
import { EffectsModule } from '@ngrx/effects';
import { NoteEffects } from './store/note.effects';
import { NotesComponent } from './notes/notes.component';
import { NoteComponent } from './note/note.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { DialogAddNoteComponent } from './dialog-add-note/dialog-add-note.component';
import { TagModule } from '../tag/tag.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    TagModule,
    StoreModule.forFeature(NOTE_FEATURE_NAME, noteReducer),
    EffectsModule.forFeature([NoteEffects]),
  ],
  declarations: [NotesComponent, NoteComponent, DialogAddNoteComponent],
  exports: [NotesComponent],
})
export class NoteModule {
  constructor() {}
}
