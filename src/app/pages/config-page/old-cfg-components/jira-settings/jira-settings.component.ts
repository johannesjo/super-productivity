import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'jira-settings',
  templateUrl: './jira-settings.component.html',
  styleUrls: ['./jira-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
