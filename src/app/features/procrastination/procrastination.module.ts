import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcrastinationComponent } from './procrastination.component';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { TaskComponent } from '../tasks/task/task.component';

@NgModule({
  imports: [CommonModule, UiModule, RouterModule, TaskComponent],
  declarations: [ProcrastinationComponent],
  exports: [ProcrastinationComponent],
})
export class ProcrastinationModule {}
