import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { WorkContextEffects } from './store/work-context.effects';
import { WORK_CONTEXT_FEATURE_NAME, workContextReducer } from './store/work-context.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(WORK_CONTEXT_FEATURE_NAME, workContextReducer),
    EffectsModule.forFeature([WorkContextEffects])
  ],
  declarations: [],
  exports: [],
})
export class WorkContextModule {
}
