import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { BeforeFinishDayEffects } from './before-finish-day.effects';

@NgModule({
  declarations: [],
  imports: [CommonModule, EffectsModule.forFeature([BeforeFinishDayEffects])],
})
export class BeforeFinishDayModule {}
