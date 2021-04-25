import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';
import { TasksModule } from '../tasks/tasks.module';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [
    TimelineComponent
  ],
  exports:[
    TimelineComponent,
  ],
  imports: [
    CommonModule,
    UiModule,
    TasksModule,
  ]
})
export class TimelineModule {
}
