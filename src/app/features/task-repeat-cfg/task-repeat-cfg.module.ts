import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {TaskRepeatCfgEffects} from './store/task-repeat-cfg.effects';
import {TASK_REPEAT_CFG_FEATURE_NAME, taskRepeatCfgReducer} from './store/task-repeat-cfg.reducer';

@NgModule({
    imports: [
        CommonModule,
        StoreModule.forFeature(TASK_REPEAT_CFG_FEATURE_NAME, taskRepeatCfgReducer),
        EffectsModule.forFeature([TaskRepeatCfgEffects])
    ],
    declarations: [],
    entryComponents: [],
    exports: [],
})
export class TaskRepeatCfgModule {
}
