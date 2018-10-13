import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigPageModule } from './config-page/config-page.module';
import { ProjectPageModule } from './project-page/project-page.module';
import { WorkViewPageModule } from './work-view/work-view-page.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigPageModule,
    ProjectPageModule,
    WorkViewPageModule
  ],
  declarations: []
})
export class PagesModule {
}
