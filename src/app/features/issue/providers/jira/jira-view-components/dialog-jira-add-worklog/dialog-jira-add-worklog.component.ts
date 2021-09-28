import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { JiraApiService } from '../../jira-api.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { JiraIssue } from '../../jira-issue/jira-issue.model';
import { Task } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { ProjectService } from '../../../../../project/project.service';
import { first } from 'rxjs/operators';
import * as moment from 'moment';
import { expandFadeAnimation } from '../../../../../../ui/animations/expand.ani';
import { getWorklogStr } from '../../../../../../util/get-work-log-str';

type FillMode = 'TIME_TODAY' | 'ALL_TIME' | 'ALL_TIME_MINUS_LOGGED';

@Component({
  selector: 'dialog-jira-add-worklog',
  templateUrl: './dialog-jira-add-worklog.component.html',
  styleUrls: ['./dialog-jira-add-worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
})
export class DialogJiraAddWorklogComponent {
  T: typeof T = T;
  timeSpent: number;
  timeLogged: number;
  started: string;
  comment: string;
  issue: JiraIssue;
  selectedFillMode?: FillMode;

  timeSpentToday: number;
  timeSpentLoggedDelta: number;

  constructor(
    private _jiraApiService: JiraApiService,
    private _matDialogRef: MatDialogRef<DialogJiraAddWorklogComponent>,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      issue: JiraIssue;
      task: Task;
    },
  ) {
    this.timeSpent = this.data.task.timeSpent;
    this.issue = this.data.issue;
    this.timeLogged = this.issue.timespent * 1000;
    this.started = this._convertTimestamp(this.data.task.created);
    this.comment = this.data.task.parentId ? this.data.task.title : '';
    this.timeSpentToday = this.data.task.timeSpentOnDay[getWorklogStr()];
    this.timeSpentLoggedDelta = Math.max(0, this.data.task.timeSpent - this.timeLogged);
  }

  close(): void {
    this._matDialogRef.close();
  }

  async submitWorklog(): Promise<void> {
    if (this.issue.id && this.started && this.timeSpent && this.data.task.projectId) {
      const cfg = await this._projectService
        .getJiraCfgForProject$(this.data.task.projectId)
        .pipe(first())
        .toPromise();
      this._jiraApiService
        .addWorklog$({
          issueId: this.issue.id,
          started: this.started,
          timeSpent: this.timeSpent,
          comment: this.comment,
          cfg,
        })
        .subscribe((res) => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.JIRA.S.ADDED_WORKLOG_FOR,
            translateParams: { issueKey: this.issue.key },
          });
          this.close();
        });
    }
  }

  fill(mode: FillMode): void {
    this.selectedFillMode = mode;

    switch (mode) {
      case 'ALL_TIME':
        this.timeSpent = this.data.task.timeSpent;
        return;
      case 'TIME_TODAY':
        this.timeSpent = this.timeSpentToday;
        return;
      case 'ALL_TIME_MINUS_LOGGED':
        this.timeSpent = this.timeSpentLoggedDelta;
        return;
    }
  }

  private _convertTimestamp(timestamp: number): string {
    const date = moment(timestamp);
    const isoStr = date.seconds(0).local().format();
    return isoStr.substring(0, 19);
  }
}
