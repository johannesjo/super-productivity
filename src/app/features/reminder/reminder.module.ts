import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReminderService } from './reminder.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
  ],
})
export class ReminderModule {
  constructor(private _reminderService: ReminderService) {
    _reminderService.init();
  }
}
