import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';

@NgModule({
  declarations: [
    TimelineComponent
  ],
  exports:[
    TimelineComponent,
  ],
  imports: [
    CommonModule
  ]
})
export class TimelineModule {
}
