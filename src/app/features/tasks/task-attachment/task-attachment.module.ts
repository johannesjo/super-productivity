import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {AttachmentEffects} from './store/attachment.effects';
import {UiModule} from '../../../ui/ui.module';
import {ATTACHMENT_FEATURE_NAME, attachmentReducer} from './store/attachment.reducer';
import {DialogEditTaskAttachmentComponent} from './dialog-edit-attachment/dialog-edit-task-attachment.component';
import {FormsModule} from '@angular/forms';
import {TaskAttachmentLinkDirective} from './task-attachment-link/task-attachment-link.directive';
import {TaskAttachmentListComponent} from './task-attachment-list/task-attachment-list.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    StoreModule.forFeature(ATTACHMENT_FEATURE_NAME, attachmentReducer),
    EffectsModule.forFeature([AttachmentEffects])
  ],
  declarations: [
    DialogEditTaskAttachmentComponent,
    TaskAttachmentLinkDirective,
    TaskAttachmentListComponent,
  ],
  entryComponents: [
    DialogEditTaskAttachmentComponent
  ],
  exports: [
    TaskAttachmentListComponent,
  ],
})
export class TaskAttachmentModule {
}
