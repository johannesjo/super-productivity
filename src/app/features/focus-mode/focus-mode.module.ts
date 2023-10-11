import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusModeOverlayComponent } from './focus-mode-overlay/focus-mode-overlay.component';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { TaskAttachmentModule } from '../tasks/task-attachment/task-attachment.module';

@NgModule({
  declarations: [FocusModeOverlayComponent],
  imports: [CommonModule, UiModule, RouterModule, TaskAttachmentModule],
  exports: [FocusModeOverlayComponent],
})
export class FocusModeModule {}
