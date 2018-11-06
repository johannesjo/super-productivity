import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeTrackingService } from './time-tracking.service';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [DialogIdleComponent],
  providers: [
    TimeTrackingService
  ]
})
export class TimeTrackingModule {
}
