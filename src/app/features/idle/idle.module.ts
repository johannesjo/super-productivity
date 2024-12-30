import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TasksModule } from '../tasks/tasks.module';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { DialogIdleSplitComponent } from './dialog-idle/dialog-idle-split-mode/dialog-idle-split.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, TasksModule],
  declarations: [DialogIdleComponent, DialogIdleSplitComponent],
})
export class IdleModule {}
