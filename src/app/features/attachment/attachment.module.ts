import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { AttachmentEffects } from './store/attachment.effects';
import { CoreModule } from '../../core/core.module';
import { UiModule } from '../../ui/ui.module';
import { ATTACHMENT_FEATURE_NAME, attachmentReducer } from './store/attachment.reducer';
import { DialogEditAttachmentComponent } from './dialog-edit-attachment/dialog-edit-attachment.component';
import { FormsModule } from '@angular/forms';
import { AttachmentLinkDirective } from './attachment-link/attachment-link.directive';
import { AttachmentListComponent } from './attachment-list/attachment-list.component';
import { AttachmentService } from './attachment.service';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    FormsModule,
    StoreModule.forFeature(ATTACHMENT_FEATURE_NAME, attachmentReducer),
    EffectsModule.forFeature([AttachmentEffects])
  ],
  declarations: [
    DialogEditAttachmentComponent,
    AttachmentLinkDirective,
    AttachmentListComponent,
  ],
  entryComponents: [
    DialogEditAttachmentComponent
  ],
  exports: [
    DialogEditAttachmentComponent,
    AttachmentListComponent,
  ],
  providers: [
    AttachmentService,
  ],
})
export class AttachmentModule {
}
