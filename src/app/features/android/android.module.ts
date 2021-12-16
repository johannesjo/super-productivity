import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { AndroidEffects } from './store/android.effects';

@NgModule({
  declarations: [],
  imports: [CommonModule, EffectsModule.forFeature([AndroidEffects])],
})
export class AndroidModule {}
