import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material';
import { SnackParams } from '../snack.model';
import { JiraApiService } from '../../../issue/jira/jira-api.service';

@Component({
  selector: 'snack-jira-unblock',
  templateUrl: './snack-jira-unblock.component.html',
  styleUrls: ['./snack-jira-unblock.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackJiraUnblockComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackParams,
    private readonly _jiraApiService: JiraApiService,
    private readonly _snackBarRef: MatSnackBarRef<SnackJiraUnblockComponent>,
  ) {
  }

  unblock() {
    this._jiraApiService.unblockAccess();
    this._snackBarRef.dismiss();
  }

}
