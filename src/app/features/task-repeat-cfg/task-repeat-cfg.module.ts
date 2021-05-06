import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { TaskRepeatCfgEffects } from './store/task-repeat-cfg.effects';
import {
  TASK_REPEAT_CFG_FEATURE_NAME,
  taskRepeatCfgReducer,
} from './store/task-repeat-cfg.reducer';
import { DialogEditTaskRepeatCfgComponent } from './dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    StoreModule.forFeature(TASK_REPEAT_CFG_FEATURE_NAME, taskRepeatCfgReducer),
    EffectsModule.forFeature([TaskRepeatCfgEffects]),
  ],
  declarations: [DialogEditTaskRepeatCfgComponent],
  exports: [],
})
export class TaskRepeatCfgModule {}
