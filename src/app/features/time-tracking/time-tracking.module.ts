import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { IdleService } from './idle.service';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TakeABreakModule } from './take-a-break/take-a-break.module';
import { TasksModule } from '../tasks/tasks.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    TasksModule,
  ],
  declarations: [
    DialogIdleComponent
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
