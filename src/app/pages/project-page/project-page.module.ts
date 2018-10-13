import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectPageComponent } from './project-page.component';
import { ProjectModule } from '../../project/project.module';
import { DialogCreateProjectComponent } from '../../project/dialogs/create-project/dialog-create-project.component';

@NgModule({
  imports: [
    CommonModule,
    ProjectModule
  ],
  declarations: [ProjectPageComponent],
  entryComponents: [DialogCreateProjectComponent]
})
export class ProjectPageModule {
}
