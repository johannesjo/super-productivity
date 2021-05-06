import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { ImprovementEffects } from './store/improvement.effects';
import {
  IMPROVEMENT_FEATURE_NAME,
  improvementReducer,
} from './store/improvement.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(IMPROVEMENT_FEATURE_NAME, improvementReducer),
    EffectsModule.forFeature([ImprovementEffects]),
  ],
  declarations: [],
  exports: [],
})
export class ImprovementModule {}
