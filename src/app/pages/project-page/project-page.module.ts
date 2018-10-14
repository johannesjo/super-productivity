import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectPageComponent } from './project-page.component';
import { ProjectModule } from '../../project/project.module';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    ProjectModule
  ],
  declarations: [ProjectPageComponent],
})
export class ProjectPageModule {
}
