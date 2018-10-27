import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'backup-settings',
  templateUrl: './backup-settings.component.html',
  styleUrls: ['./backup-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackupSettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
