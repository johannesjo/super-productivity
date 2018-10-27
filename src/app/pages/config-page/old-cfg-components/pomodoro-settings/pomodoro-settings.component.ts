import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'pomodoro-settings',
  templateUrl: './pomodoro-settings.component.html',
  styleUrls: ['./pomodoro-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PomodoroSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
