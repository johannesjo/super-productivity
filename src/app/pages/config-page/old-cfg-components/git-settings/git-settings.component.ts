import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'git-settings',
  templateUrl: './git-settings.component.html',
  styleUrls: ['./git-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GitSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
