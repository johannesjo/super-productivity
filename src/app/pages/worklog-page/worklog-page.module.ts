import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorklogPageComponent } from './worklog-page.component';
import { UiModule } from '../../ui/ui.module';
import { WorklogModule } from '../../features/worklog/worklog.module';

@NgModule({
  declarations: [WorklogPageComponent],
  imports: [
    CommonModule,
    UiModule,
    WorklogModule,
  ]
})
export class WorklogPageModule {
}
