import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { IssueLocalState } from '../../issue';
import { JiraIssue } from '../jira-issue/jira-issue.model';
import { JiraIssueService } from '../jira-issue/jira-issue.service';
import { Observable } from 'rxjs';
import { JiraTransitionOption } from '../jira';
import { JiraApiService } from '../jira-api.service';
import { JiraOriginalTransition } from '../jira-api-responses';
import { SnackService } from '../../../core/snack/snack.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'dialog-jira-transition',
  templateUrl: './dialog-jira-transition.component.html',
  styleUrls: ['./dialog-jira-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraTransitionComponent {
  availableTransitions$: Observable<JiraOriginalTransition[]> = this._jiraApiService.getTransitionsForIssue(this.data.issue.id);

  // TODO this doesn't work as the ids don't match :(
  chosenTransitionId: JiraTransitionOption | string = this.data.issue.status && this.data.issue.status.id;

  constructor(
    private _jiraIssueService: JiraIssueService,
    private _jiraApiService: JiraApiService,
    private _matDialogRef: MatDialogRef<DialogJiraTransitionComponent>,
    private _snackService: SnackService,
    @Inject(MAT_DIALOG_DATA) public data: {
      issue: JiraIssue,
      localState: IssueLocalState
    }
  ) {
  }

  close() {
    this._matDialogRef.close();
  }

  transitionIssue() {
    if (this.chosenTransitionId) {
      this._jiraApiService.transitionIssue(this.data.issue.id, this.chosenTransitionId)
        .pipe(take(1))
        .subscribe(() => {
          this._jiraIssueService.updateIssueFromApi(this.data.issue.id, this.data.issue, false, false);
          this._snackService.open({type: 'SUCCESS', message: 'Jira: Successfully transitioned issue'});
          this.close();
        });
    }
  }
}
