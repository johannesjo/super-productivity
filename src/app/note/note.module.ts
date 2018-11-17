import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromNote from './store/note.reducer';
import { EffectsModule } from '@ngrx/effects';
import { NoteEffects } from './store/note.effects';
import { NotesComponent } from './notes/notes.component';
import { NoteComponent } from './note/note.component';
import { UiModule } from '../ui/ui.module';
import { NoteService } from './note.service';
import { NOTE_FEATURE_NAME } from './store/note.reducer';

@NgModule({
  declarations: [NotesComponent, NoteComponent],
  imports: [
    CommonModule,
    UiModule,
    StoreModule.forFeature(NOTE_FEATURE_NAME, fromNote.reducer),
    EffectsModule.forFeature([NoteEffects]),
  ],
  exports: [NotesComponent],
  providers: [NoteService]
})
export class NoteModule {
}
