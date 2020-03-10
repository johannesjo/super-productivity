import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NonProjectContextPageComponent} from './non-project-context-page.component';
import {WorkViewModule} from '../../features/work-view/work-view.module';

@NgModule({
  declarations: [
    NonProjectContextPageComponent,
  ],
  imports: [
    CommonModule,
    WorkViewModule,
  ],
})
export class NonProjectContextPageModule {
}
