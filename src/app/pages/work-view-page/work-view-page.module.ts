import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WorkViewPageComponent} from './work-view-page.component';
import {WorkViewModule} from '../../features/work-view/work-view.module';

@NgModule({
  imports: [
    CommonModule,
    WorkViewModule,
  ],
  declarations: [WorkViewPageComponent],
})
export class WorkViewPageModule {
}
