import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { PomodoroEffects } from '../pomodoro/store/pomodoro.effects';
import { DominaModeEffects } from './store/domina-mode.effects';

@NgModule({
  declarations: [],
  imports: [CommonModule, EffectsModule.forFeature([PomodoroEffects, DominaModeEffects])],
})
export class DominaModeModule {}
