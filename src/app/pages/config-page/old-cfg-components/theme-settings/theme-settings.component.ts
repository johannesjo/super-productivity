import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'theme-settings',
  templateUrl: './theme-settings.component.html',
  styleUrls: ['./theme-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
