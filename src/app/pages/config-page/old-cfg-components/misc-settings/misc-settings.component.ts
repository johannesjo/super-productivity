import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'misc-settings',
  templateUrl: './misc-settings.component.html',
  styleUrls: ['./misc-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiscSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
