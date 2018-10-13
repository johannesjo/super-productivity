import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectPageComponent } from './project-page.component';
import { ProjectModule } from '../../project/project.module';

@NgModule({
  imports: [
    CommonModule,
    ProjectModule
  ],
  declarations: [ProjectPageComponent],
})
export class ProjectPageModule {
}
