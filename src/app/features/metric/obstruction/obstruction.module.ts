import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { ObstructionEffects } from './store/obstruction.effects';
import {
  OBSTRUCTION_FEATURE_NAME,
  obstructionReducer,
} from './store/obstruction.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(OBSTRUCTION_FEATURE_NAME, obstructionReducer),
    EffectsModule.forFeature([ObstructionEffects]),
  ],
  declarations: [],
  exports: [],
})
export class ObstructionModule {}
