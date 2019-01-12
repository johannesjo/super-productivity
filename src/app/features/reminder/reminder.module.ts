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
  providers: [
    ReminderService,
  ]
})
export class ReminderModule {
  constructor(private _reminderService: ReminderService) {
    _reminderService.init();
  }
}
