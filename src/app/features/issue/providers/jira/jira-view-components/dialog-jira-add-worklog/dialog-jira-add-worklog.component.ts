import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { JiraApiService } from '../../jira-api.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { JiraIssue } from '../../jira-issue/jira-issue.model';
import { Task } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { ProjectService } from '../../../../../project/project.service';
import { first } from 'rxjs/operators';
import moment from 'moment';
import { expandFadeAnimation } from '../../../../../../ui/animations/expand.ani';
import {
  JIRA_ISSUE_TYPE,
  JIRA_WORK_LOG_EXPORT_CHECKBOXES,
  JIRA_WORK_LOG_EXPORT_FORM_OPTIONS,
} from '../../jira.const';
import { JiraWorklogExportDefaultTime } from '../../jira.model';
import { Subscription } from 'rxjs';
import { DateService } from 'src/app/core/date/date.service';

@Component({
  selector: 'dialog-jira-add-worklog',
  templateUrl: './dialog-jira-add-worklog.component.html',
  styleUrls: ['./dialog-jira-add-worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
})
export class DialogJiraAddWorklogComponent implements OnDestroy {
  T: typeof T = T;
  timeSpent: number;
  timeLogged: number;
  started: string;
  comment: string;
  issue: JiraIssue;
  selectedDefaultTimeMode?: JiraWorklogExportDefaultTime;
  defaultTimeOptions = JIRA_WORK_LOG_EXPORT_FORM_OPTIONS;
  defaultTimeCheckboxContent?: {
    label: string;
    value: JiraWorklogExportDefaultTime;
    isChecked: boolean;
  };
  timeSpentToday: number;
  timeSpentLoggedDelta: number;

  private _subs = new Subscription();

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
    private _dateService: DateService,
  ) {
    this.timeSpent = this.data.task.timeSpent;
    this.issue = this.data.issue;
    this.timeLogged = this.issue.timespent * 1000;
    this.started = this._convertTimestamp(this.data.task.created);
    this.comment = this.data.task.parentId ? this.data.task.title : '';
    this.timeSpentToday = this.data.task.timeSpentOnDay[this._dateService.todayStr()];
    this.timeSpentLoggedDelta = Math.max(0, this.data.task.timeSpent - this.timeLogged);

    this._subs.add(
      this._projectService
        .getJiraCfgForProject$(this.data.task.projectId as string)
        .pipe(first())
        .subscribe((cfg) => {
          if (cfg.worklogDialogDefaultTime) {
            this.timeSpent = this.getTimeToLogForMode(cfg.worklogDialogDefaultTime);
            this.started = this._fillInStarted(cfg.worklogDialogDefaultTime);
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
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

      if (this.defaultTimeCheckboxContent?.isChecked === true) {
        this._projectService.updateIssueProviderConfig(
          this.data.task.projectId,
          JIRA_ISSUE_TYPE,
          {
            worklogDialogDefaultTime: this.defaultTimeCheckboxContent.value,
          },
        );
      }

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

  fill(mode: JiraWorklogExportDefaultTime): void {
    this.selectedDefaultTimeMode = mode;
    this.timeSpent = this.getTimeToLogForMode(mode);
    const matchingCheckboxCfg = JIRA_WORK_LOG_EXPORT_CHECKBOXES.find(
      (checkCfg) => checkCfg.value === mode,
    );
    this.defaultTimeCheckboxContent = matchingCheckboxCfg
      ? { ...matchingCheckboxCfg, isChecked: false }
      : undefined;
    this.started = this._fillInStarted(mode);
  }

  getTimeToLogForMode(mode: JiraWorklogExportDefaultTime): number {
    switch (mode) {
      case JiraWorklogExportDefaultTime.AllTime:
        return this.data.task.timeSpent;
      case JiraWorklogExportDefaultTime.TimeToday:
        return this.timeSpentToday;
      case JiraWorklogExportDefaultTime.AllTimeMinusLogged:
        return this.timeSpentLoggedDelta;
    }
    return 0;
  }

  private _convertTimestamp(timestamp: number): string {
    const date = moment(timestamp);
    const isoStr = date.seconds(0).local().format();
    return isoStr.substring(0, 19);
  }

  private _fillInStarted(mode: JiraWorklogExportDefaultTime): string {
    if (mode === JiraWorklogExportDefaultTime.TimeToday) {
      return this._convertTimestamp(Date.now());
    } else if (mode === JiraWorklogExportDefaultTime.TimeYesterday) {
      const oneDay = 24 * 60 * 60 * 1000;
      return this._convertTimestamp(Date.now() - oneDay);
    } else {
      return this._convertTimestamp(this.data.task.created);
    }
  }
}
