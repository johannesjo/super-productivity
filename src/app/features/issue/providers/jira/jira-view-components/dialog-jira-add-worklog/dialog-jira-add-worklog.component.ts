import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { JiraApiService } from '../../jira-api.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { JiraIssue } from '../../jira-issue/jira-issue.model';
import { Task } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { ProjectService } from '../../../../../project/project.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'dialog-jira-add-worklog',
  templateUrl: './dialog-jira-add-worklog.component.html',
  styleUrls: ['./dialog-jira-add-worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraAddWorklogComponent {
  T: typeof T = T;
  timeSpent: number;
  started: string;
  comment: string;
  issue: JiraIssue;

  constructor(
    private _jiraApiService: JiraApiService,
    private _matDialogRef: MatDialogRef<DialogJiraAddWorklogComponent>,
    private _snackService: SnackService,
    private _projectService: ProjectService,
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

  async submitWorklog() {
    if (this.issue.id && this.started && this.timeSpent && this.data.task.projectId) {
      const cfg = await this._projectService.getJiraCfgForProject$(this.data.task.projectId).pipe(first()).toPromise();
      this._jiraApiService.addWorklog$({
        issueId: this.issue.id,
        started: this.started,
        timeSpent: this.timeSpent,
        comment: this.comment,
        cfg,
      }).subscribe(res => {
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
