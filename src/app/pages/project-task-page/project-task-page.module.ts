import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectTaskPageComponent } from './project-task-page.component';
import { WorkViewModule } from '../../features/work-view/work-view.module';

@NgModule({
  imports: [CommonModule, WorkViewModule],
  declarations: [ProjectTaskPageComponent],
})
export class ProjectTaskPageModule {}
