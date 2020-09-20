import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { IdleService } from './idle.service';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TakeABreakModule } from './take-a-break/take-a-break.module';
import { TasksModule } from '../tasks/tasks.module';
import { DialogStartTrackingReminderComponent } from '../start-tracking-reminder/dialog-start-tracking-reminder/dialog-start-tracking-reminder.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    TasksModule,
  ],
  declarations: [
    DialogIdleComponent,
    DialogStartTrackingReminderComponent
  ],
  exports: [
    TakeABreakModule,
  ]
})
export class TimeTrackingModule {
  constructor(
    private readonly _idleService: IdleService,
  ) {
    this._idleService.init();
  }
}
