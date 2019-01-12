import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PomodoroService } from './pomodoro.service';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { PomodoroEffects } from './store/pomodoro.effects';
import { POMODORO_FEATURE_NAME, pomodoroReducer } from './store/pomodoro.reducer';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    StoreModule.forFeature(POMODORO_FEATURE_NAME, pomodoroReducer),
    EffectsModule.forFeature([PomodoroEffects]),
  ],
  providers: [PomodoroService],
})
export class PomodoroModule {
}
