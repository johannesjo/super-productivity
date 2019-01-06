import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { JiraIssueService } from '../jira-issue/jira-issue.service';
import { JiraApiService } from '../jira-api.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { SnackService } from '../../../core/snack/snack.service';
import { JiraIssue } from '../jira-issue/jira-issue.model';
import { Task } from '../../../tasks/task.model';
import { getWorklogStr } from '../../../core/util/get-work-log-str';

@Component({
  selector: 'dialog-jira-add-worklog',
  templateUrl: './dialog-jira-add-worklog.component.html',
  styleUrls: ['./dialog-jira-add-worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraAddWorklogComponent {
  timeSpent: number;
  started: string;
  comment: string;
  issue: JiraIssue;

  constructor(
    private _jiraIssueService: JiraIssueService,
    private _jiraApiService: JiraApiService,
    private _matDialogRef: MatDialogRef<DialogJiraAddWorklogComponent>,
    private _snackService: SnackService,
    @Inject(MAT_DIALOG_DATA) public data: {
      issue: JiraIssue,
      task: Task,
    }
  ) {
    this.timeSpent = this.data.task.timeSpent;
    this.issue = this.data.issue;
    this.started = getWorklogStr(this.data.task.created);
  }

  close() {
    this._matDialogRef.close();
  }

  submitWorklog() {

  }
}
