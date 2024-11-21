import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { OpenProjectApiService } from '../../open-project-api.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { Task } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import moment from 'moment';
import { OpenProjectWorkPackage } from '../../open-project-issue/open-project-issue.model';
import { parseOpenProjectDuration } from '../parse-open-project-duration.util';
import { JiraWorklogExportDefaultTime } from '../../../jira/jira.model';
import {
  JIRA_WORK_LOG_EXPORT_CHECKBOXES,
  JIRA_WORK_LOG_EXPORT_FORM_OPTIONS,
} from '../../../jira/jira.const';
import { Observable, Subscription } from 'rxjs';
import { expandFadeAnimation } from '../../../../../../ui/animations/expand.ani';
import { DateService } from 'src/app/core/date/date.service';
import { IssueProviderService } from '../../../../issue-provider.service';
import { OpenProjectCfg } from '../../open-project.model';
import { formatOpenProjectWorkPackageSubjectForSnack } from '../../format-open-project-work-package-subject.util';
import { concatMap, first } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { IssueProviderActions } from '../../../../store/issue-provider.actions';

@Component({
  selector: 'dialog-open-project-track-time',
  templateUrl: './dialog-open-project-track-time.component.html',
  styleUrls: ['./dialog-open-project-track-time.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
})
export class DialogOpenProjectTrackTimeComponent {
  T: typeof T = T;
  timeSpent: number;
  started: string;
  comment: string;
  workPackage: OpenProjectWorkPackage;
  timeLoggedForWorkPackage: number = 0;
  selectedDefaultTimeMode?: JiraWorklogExportDefaultTime;
  defaultTimeOptions = JIRA_WORK_LOG_EXPORT_FORM_OPTIONS;
  defaultTimeCheckboxContent?: {
    label: string;
    value: JiraWorklogExportDefaultTime;
    isChecked: boolean;
  };
  timeSpentToday: number;
  timeSpentLoggedDelta: number;

  activityId: number = 1;
  activities$ = this._getCfgOnce$(this.data.task.issueProviderId as string).pipe(
    concatMap((cfg) => {
      return this._openProjectApiService.getActivitiesForTrackTime$(
        this.workPackage.id,
        cfg,
      );
    }),
  );
  private _subs = new Subscription();

  constructor(
    private _openProjectApiService: OpenProjectApiService,
    private _matDialogRef: MatDialogRef<DialogOpenProjectTrackTimeComponent>,
    private _snackService: SnackService,
    private _store: Store,
    private _issueProviderService: IssueProviderService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      workPackage: OpenProjectWorkPackage;
      task: Task;
    },
    private _dateService: DateService,
  ) {
    this.timeSpent = this.data.task.timeSpent;
    this.workPackage = this.data.workPackage;
    this.started = this._convertTimestamp(this.data.task.created);
    this.comment = this.data.task.parentId ? this.data.task.title : '';
    this.timeLoggedForWorkPackage = parseOpenProjectDuration(
      this.workPackage.spentTime as string,
    );
    this.timeSpentToday = this.data.task.timeSpentOnDay[this._dateService.todayStr()];
    this.timeSpentLoggedDelta = Math.max(
      0,
      this.data.task.timeSpent - this.timeLoggedForWorkPackage,
    );

    this._subs.add(
      this._getCfgOnce$(this.data.task.issueProviderId as string)
        .pipe(first())
        .subscribe((cfg) => {
          if (cfg.timeTrackingDialogDefaultTime) {
            this.timeSpent = this.getTimeToLogForMode(cfg.timeTrackingDialogDefaultTime);
            this.started = this._fillInStarted(cfg.timeTrackingDialogDefaultTime);
          }
        }),
    );
  }

  close(): void {
    this._matDialogRef.close();
  }

  async postTime(): Promise<void> {
    if (
      this.workPackage.id &&
      this.started &&
      this.timeSpent &&
      this.data.task.issueProviderId
    ) {
      const cfg = await this._getCfgOnce$(this.data.task.issueProviderId)
        .pipe(first())
        .toPromise();

      if (this.defaultTimeCheckboxContent?.isChecked === true) {
        this._store.dispatch(
          IssueProviderActions.updateIssueProvider({
            issueProvider: {
              id: this.data.task.issueProviderId,
              changes: {
                timeTrackingDialogDefaultTime: this.defaultTimeCheckboxContent.value,
              },
            },
          }),
        );
      }
      this._openProjectApiService
        .trackTime$({
          workPackage: this.workPackage,
          spentOn: moment(this.started).format('YYYY-MM-DD'),
          hours: moment.duration({ milliseconds: this.timeSpent }).toISOString(),
          comment: this.comment,
          activityId: this.activityId,
          cfg,
        })
        .subscribe((res) => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.OPEN_PROJECT.S.POST_TIME_SUCCESS,
            translateParams: {
              issueTitle: formatOpenProjectWorkPackageSubjectForSnack(this.workPackage),
            },
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

  private _getCfgOnce$(issueProviderId: string): Observable<OpenProjectCfg> {
    return this._issueProviderService.getCfgOnce$(issueProviderId, 'OPEN_PROJECT');
  }
}
