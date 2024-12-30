import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogEditTaskAttachmentComponent } from './dialog-edit-attachment/dialog-edit-task-attachment.component';
import { FormsModule } from '@angular/forms';
import { TaskAttachmentLinkDirective } from './task-attachment-link/task-attachment-link.directive';
import { TaskAttachmentListComponent } from './task-attachment-list/task-attachment-list.component';

@NgModule({
  imports: [
    CommonModule,

    FormsModule,
    DialogEditTaskAttachmentComponent,
    TaskAttachmentLinkDirective,
    TaskAttachmentListComponent,
  ],
  exports: [TaskAttachmentListComponent, TaskAttachmentLinkDirective],
})
export class TaskAttachmentModule {}
