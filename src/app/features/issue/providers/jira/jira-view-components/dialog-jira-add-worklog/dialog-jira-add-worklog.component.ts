import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {JiraApiService} from '../../jira-api.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {SnackService} from '../../../../../../core/snack/snack.service';
import {JiraIssue} from '../../jira-issue/jira-issue.model';
import {Task} from '../../../../../tasks/task.model';
import {T} from '../../../../../../t.const';

@Component({
  selector: 'dialog-jira-add-worklog',
  templateUrl: './dialog-jira-add-worklog.component.html',
  styleUrls: ['./dialog-jira-add-worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraAddWorklogComponent {
  T = T;
  timeSpent: number;
  started: string;
  comment: string;
  issue: JiraIssue;

  constructor(
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
    this.started = this._convertTimestamp(this.data.task.created);
    this.comment = this.data.task.title;
  }

  close() {
    this._matDialogRef.close();
  }

  submitWorklog() {
    if (this.issue.id && this.started && this.timeSpent) {
      this._jiraApiService.addWorklog$(
        this.issue.id,
        this.started,
        this.timeSpent,
        this.comment,
      ).subscribe(res => {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.JIRA.S.ADDED_WORKLOG_FOR,
          translateParams: {issueKey: this.issue.key}
        });
        this.close();
      });
    }
  }

  private _convertTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    date.setSeconds(0, 0);
    const isoStr = date.toISOString();
    return isoStr.substring(0, isoStr.length - 1);
  }
}
