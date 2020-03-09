import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IntelligentListPageComponent} from './intelligent-list-page.component';
import {WorkViewModule} from '../../features/work-view/work-view.module';


@NgModule({
  declarations: [
    IntelligentListPageComponent,
  ],
  imports: [
    CommonModule,
    WorkViewModule,
  ],
})
export class IntelligentListPageModule {
}
