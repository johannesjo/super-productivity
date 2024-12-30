import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TagListComponent } from './tag-list/tag-list.component';
import { DialogEditTagsForTaskComponent } from './dialog-edit-tags/dialog-edit-tags-for-task.component';
import { TagComponent } from './tag/tag.component';
import { IssueModule } from '../issue/issue.module';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, IssueModule],
  declarations: [
    TagListComponent,
    DialogEditTagsForTaskComponent,
    TagComponent,
    // FindContrastColorPipe
  ],
  exports: [DialogEditTagsForTaskComponent, TagListComponent, TagComponent],
})
export class TagModule {}
