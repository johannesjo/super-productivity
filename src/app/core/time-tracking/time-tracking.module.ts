import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeTrackingService } from './time-tracking.service';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { IdleService } from './idle.service';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [DialogIdleComponent],
  providers: [
    TimeTrackingService,
    IdleService,
  ]
})
export class TimeTrackingModule {
  constructor(
    private readonly _timeTrackingService: TimeTrackingService,
    private readonly _idleService: IdleService,
  ) {
    this._idleService.init();
  }
}
