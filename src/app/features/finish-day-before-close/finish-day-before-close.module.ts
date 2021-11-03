import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { FinishDayBeforeCloseEffects } from './finish-day-before-close.effects';

@NgModule({
  declarations: [],
  imports: [CommonModule, EffectsModule.forFeature([FinishDayBeforeCloseEffects])],
})
export class FinishDayBeforeCloseModule {}
