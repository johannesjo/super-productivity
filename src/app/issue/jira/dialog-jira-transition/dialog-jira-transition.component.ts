import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { IssueLocalState } from '../../issue';
import { JiraIssue } from '../jira-issue/jira-issue.model';
import { JiraIssueService } from '../jira-issue/jira-issue.service';
import { Observable } from 'rxjs';
import { JiraTransitionOption } from '../jira';
import { JiraApiService } from '../jira-api.service';
import { JiraOriginalTransition } from '../jira-api-responses';

@Component({
  selector: 'dialog-jira-transition',
  templateUrl: './dialog-jira-transition.component.html',
  styleUrls: ['./dialog-jira-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraTransitionComponent {
  issueData$: Observable<JiraIssue> = this._jiraIssueService.getById(this.data.issueId);
  chosenTransitionId: JiraTransitionOption | string;
  availableTransitions$: Observable<JiraOriginalTransition[]> = this._jiraApiService.getTransitionsForIssue(this.data.issueId);

  constructor(
    private _jiraIssueService: JiraIssueService,
    private _jiraApiService: JiraApiService,
    private _matDialogRef: MatDialogRef<DialogJiraTransitionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      issueId: string,
      issueTitle: string,
      localState: IssueLocalState
    }
  ) {
  }

  close(res: any) {
    this._matDialogRef.close(res);
  }

  transitionIssue() {
    console.log();
    
  }

}
