import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TasksModule } from '../tasks/tasks.module';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, TasksModule],
  declarations: [DialogIdleComponent],
})
export class IdleModule {}
