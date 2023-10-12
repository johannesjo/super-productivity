import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusModeOverlayComponent } from './focus-mode-overlay/focus-mode-overlay.component';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { TaskAttachmentModule } from '../tasks/task-attachment/task-attachment.module';
import { FocusModeMainComponent } from './focus-mode-main/focus-mode-main.component';
import { FocusModeTaskSelectionComponent } from './focus-mode-task-selection/focus-mode-task-selection.component';
import { FocusModeTaskDoneComponent } from './focus-mode-task-done/focus-mode-task-done.component';
import { TasksModule } from '../tasks/tasks.module';

@NgModule({
  declarations: [
    FocusModeOverlayComponent,
    FocusModeMainComponent,
    FocusModeTaskSelectionComponent,
    FocusModeTaskDoneComponent,
  ],
  imports: [CommonModule, UiModule, RouterModule, TaskAttachmentModule, TasksModule],
  exports: [FocusModeOverlayComponent],
})
export class FocusModeModule {}
