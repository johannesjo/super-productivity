import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { OpenProjectApiService } from '../../open-project-api.service';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { Task } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { ProjectService } from '../../../../../project/project.service';
import { concatMap, first } from 'rxjs/operators';
import * as moment from 'moment';
import { OpenProjectWorkPackage } from '../../open-project-issue/open-project-issue.model';
import { parseOpenProjectDuration } from '../parse-open-project-duration.util';
import { formatOpenProjectWorkPackageSubjectForSnack } from '../../format-open-project-work-package-subject.util';
import { JiraWorklogExportDefaultTime } from '../../../jira/jira.model';
import {
  JIRA_WORK_LOG_EXPORT_CHECKBOXES,
  JIRA_WORK_LOG_EXPORT_FORM_OPTIONS,
} from '../../../jira/jira.const';
import { Subscription } from 'rxjs';
import { OPEN_PROJECT_TYPE } from '../../../../issue.const';
import { expandFadeAnimation } from '../../../../../../ui/animations/expand.ani';
import { DateService } from 'src/app/core/date/date.service';

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
  activities$ = this._projectService
    .getOpenProjectCfgForProject$(this.data.task.projectId as string)
    .pipe(
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
    private _projectService: ProjectService,
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
      this._projectService
        .getOpenProjectCfgForProject$(this.data.task.projectId as string)
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
      this.data.task.projectId
    ) {
      const cfg = await this._projectService
        .getOpenProjectCfgForProject$(this.data.task.projectId)
        .pipe(first())
        .toPromise();

      if (this.defaultTimeCheckboxContent?.isChecked === true) {
        this._projectService.updateIssueProviderConfig(
          this.data.task.projectId,
          OPEN_PROJECT_TYPE,
          {
            timeTrackingDialogDefaultTime: this.defaultTimeCheckboxContent.value,
          },
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
}
