import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotesComponent } from './notes/notes.component';
import { NoteComponent } from './note/note.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { DialogAddNoteComponent } from './dialog-add-note/dialog-add-note.component';
import { TagModule } from '../tag/tag.module';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';

@NgModule({
  imports: [CommonModule, FormsModule, UiModule, TagModule, CdkDropList, CdkDrag],
  declarations: [NotesComponent, NoteComponent, DialogAddNoteComponent],
  exports: [NotesComponent],
})
export class NoteModule {
  constructor() {}
}
