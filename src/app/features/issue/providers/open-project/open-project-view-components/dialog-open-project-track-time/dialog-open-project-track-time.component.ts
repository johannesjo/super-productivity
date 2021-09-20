import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { OpenProjectApiService } from '../../open-project-api.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { Task } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { ProjectService } from '../../../../../project/project.service';
import { first } from 'rxjs/operators';
import * as moment from 'moment';
import { OpenProjectWorkPackage } from '../../open-project-issue/open-project-issue.model';
import { parseOpenProjectDuration } from '../parse-open-project-duration.util';

@Component({
  selector: 'dialog-open-project-track-time',
  templateUrl: './dialog-open-project-track-time.component.html',
  styleUrls: ['./dialog-open-project-track-time.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogOpenProjectTrackTimeComponent {
  T: typeof T = T;
  timeSpent: number;
  started: string;
  comment: string;
  workPackage: OpenProjectWorkPackage;
  timeSpentForWorkPackage: number = 0;

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
  ) {
    this.timeSpent = this.data.task.timeSpent;
    this.workPackage = this.data.workPackage;
    this.started = this._convertTimestamp(this.data.task.created);
    this.comment = this.data.task.title;
    this.timeSpentForWorkPackage = parseOpenProjectDuration(
      this.workPackage.spentTime as string,
    );
    console.log(
      this.timeSpentForWorkPackage,
      this.workPackage.spentTime,
      this.workPackage,
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
      this._openProjectApiService
        .trackTime$({
          workPackageId: this.workPackage.id,
          started: this.started,
          timeSpent: this.timeSpent,
          comment: this.comment,
          cfg,
        })
        .subscribe((res) => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: 'SUC',
            // msg: T.F.OPEN_PROJECT.S.ADDED_WORKLOG_FOR,
            translateParams: { workPackageKey: this.workPackage.id },
          });
          this.close();
        });
    }
  }

  private _convertTimestamp(timestamp: number): string {
    const date = moment(timestamp);
    const isoStr = date.seconds(0).local().format();
    return isoStr.substring(0, 19);
  }
}
