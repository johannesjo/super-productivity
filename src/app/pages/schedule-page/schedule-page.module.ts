import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SchedulePageComponent} from './schedule-page.component';
import {UiModule} from '../../ui/ui.module';


@NgModule({
  declarations: [SchedulePageComponent],
  imports: [
    CommonModule,
    UiModule,
  ],
  exports: [SchedulePageComponent]
})
export class SchedulePageModule {
}
