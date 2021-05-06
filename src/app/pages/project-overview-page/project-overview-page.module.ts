import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectOverviewPageComponent } from './project-overview-page.component';
import { ProjectModule } from '../../features/project/project.module';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [CommonModule, UiModule, ProjectModule],
  declarations: [ProjectOverviewPageComponent],
})
export class ProjectOverviewPageModule {}
