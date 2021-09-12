import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TasksModule } from '../tasks/tasks.module';
import { DialogTrackingReminderComponent } from './dialog-tracking-reminder/dialog-tracking-reminder.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, TasksModule],
  declarations: [DialogTrackingReminderComponent],
})
export class TrackingReminderModule {}
