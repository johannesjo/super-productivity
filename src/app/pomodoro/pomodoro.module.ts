import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PomodoroService } from './pomodoro.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [PomodoroService],
})
export class PomodoroModule {
}
