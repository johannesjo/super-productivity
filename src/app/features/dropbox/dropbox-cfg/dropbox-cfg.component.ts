import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'dropbox-cfg',
  templateUrl: './dropbox-cfg.component.html',
  styleUrls: ['./dropbox-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropboxCfgComponent {

  constructor() {
  }
}
