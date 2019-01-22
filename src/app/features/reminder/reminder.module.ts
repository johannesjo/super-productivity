import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReminderService } from './reminder.service';
import { CoreModule } from '../../core/core.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    CoreModule,
  ],
})
export class ReminderModule {
  constructor(private _reminderService: ReminderService) {
    _reminderService.init();
  }
}
