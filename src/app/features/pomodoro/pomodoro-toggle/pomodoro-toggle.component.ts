import { Component } from '@angular/core';
import { PomodoroService } from '../pomodoro.service';
import { NgModule } from '@angular/core';

interface Dummy {
  value: number | 'auto';
  str: string;
}

@Component({
  selector: 'main-header',
  templateUrl: '../../../core-ui/main-header/main-header.component.html',
  styleUrls: ['../../../core-ui/main-header/main-header.component.scss'],
})
export class ToggleComponent {
  toggle = true;
  status = 'Enable';

  enableDisableRule(job: any) {
    this.toggle = !this.toggle;
    this.status = this.toggle ? 'Enable' : 'Disable';
  }
}
