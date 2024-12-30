import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogEditTaskRepeatCfgComponent } from './dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule],
  declarations: [DialogEditTaskRepeatCfgComponent],
  exports: [],
})
export class TaskRepeatCfgModule {}
