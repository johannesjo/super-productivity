import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'keyboard-settings',
  templateUrl: './keyboard-settings.component.html',
  styleUrls: ['./keyboard-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeyboardSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
