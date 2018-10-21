import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeTrackingService } from './time-tracking.service';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [],
  providers: [
    TimeTrackingService
  ]
})
export class TimeTrackingModule {
  constructor(private readonly _timeTrackingService: TimeTrackingService) {
    this._timeTrackingService.init();
  }
}
