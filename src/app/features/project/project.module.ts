import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from './project.service';
import { DialogCreateProjectComponent } from './dialogs/create-project/dialog-create-project.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [CommonModule, UiModule],
  declarations: [DialogCreateProjectComponent],
  providers: [ProjectService],
})
export class ProjectModule {}
