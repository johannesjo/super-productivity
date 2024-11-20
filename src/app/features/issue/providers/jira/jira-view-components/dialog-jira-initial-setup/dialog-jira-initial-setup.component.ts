import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { JiraCfg } from '../../jira.model';
import { T } from '../../../../../../t.const';
import { MatIcon } from '@angular/material/icon';
import { JiraViewComponentsModule } from '../jira-view-components.module';
import { UiModule } from '../../../../../../ui/ui.module';

@Component({
  selector: 'dialog-jira-initial-setup',
  templateUrl: './dialog-jira-initial-setup.component.html',
  styleUrls: ['./dialog-jira-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatDialogTitle,
    MatIcon,
    MatDialogContent,
    JiraViewComponentsModule,
    UiModule,
  ],
})
export class DialogJiraInitialSetupComponent {
  T: typeof T = T;
  jiraCfg: JiraCfg;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogJiraInitialSetupComponent>,
  ) {
    this.jiraCfg = this.data.cfg;
  }

  saveJiraCfg(cfg: JiraCfg): void {
    this._matDialogRef.close({
      ...cfg,
      isEnabled: !!(cfg && cfg.host && cfg.userName && cfg.password),
    });
  }
}
