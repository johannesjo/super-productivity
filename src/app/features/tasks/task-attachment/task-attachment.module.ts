import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../ui/ui.module';
import { DialogEditTaskAttachmentComponent } from './dialog-edit-attachment/dialog-edit-task-attachment.component';
import { FormsModule } from '@angular/forms';
import { TaskAttachmentLinkDirective } from './task-attachment-link/task-attachment-link.directive';
import { TaskAttachmentListComponent } from './task-attachment-list/task-attachment-list.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule],
  declarations: [
    DialogEditTaskAttachmentComponent,
    TaskAttachmentLinkDirective,
    TaskAttachmentListComponent,
  ],
  exports: [TaskAttachmentListComponent],
})
export class TaskAttachmentModule {}
