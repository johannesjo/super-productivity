import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ProjectListComponent} from './project-list.component';
import {UiModule} from '../../ui/ui.module';
import {RouterModule} from '@angular/router';

@NgModule({

  imports: [
    UiModule,
    CommonModule,
    RouterModule,
  ],
  declarations: [
    ProjectListComponent,
  ],
  exports: [
    ProjectListComponent,
  ]
})
export class ProjectListModule {
}
