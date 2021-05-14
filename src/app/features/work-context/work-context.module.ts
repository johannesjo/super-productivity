import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { WorkContextEffects } from './store/work-context.effects';
import { workContextReducer } from './store/work-context.reducer';
import { WORK_CONTEXT_FEATURE_NAME } from './store/work-context.selectors';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(WORK_CONTEXT_FEATURE_NAME, workContextReducer),
    EffectsModule.forFeature([WorkContextEffects]),
  ],
  declarations: [],
  exports: [],
})
export class WorkContextModule {}
