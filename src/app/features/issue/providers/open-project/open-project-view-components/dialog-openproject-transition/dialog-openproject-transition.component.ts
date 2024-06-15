import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { Observable } from 'rxjs';
import { concatMap, first, switchMap } from 'rxjs/operators';
import { SnackService } from 'src/app/core/snack/snack.service';
import { IssueLocalState } from 'src/app/features/issue/issue.model';
import { IssueService } from 'src/app/features/issue/issue.service';
import { ProjectService } from 'src/app/features/project/project.service';
import { T } from 'src/app/t.const';
import { Task } from '../../../../../tasks/task.model';
import { OpenProjectOriginalStatus } from '../../open-project-api-responses';
import { OpenProjectApiService } from '../../open-project-api.service';
import { OpenProjectWorkPackage } from '../../open-project-issue/open-project-issue.model';
import { OpenProjectCfg } from '../../open-project.model';

@Component({
  selector: 'dialog-openproject-transition',
  templateUrl: './dialog-openproject-transition.component.html',
  styleUrls: ['./dialog-openproject-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogOpenprojectTransitionComponent {
  T: typeof T = T;

  _openProjectCfg$: Observable<OpenProjectCfg> =
    this._projectService.getOpenProjectCfgForProject$(this.data.task.projectId as string);

  availableTransitions$: Observable<OpenProjectOriginalStatus[]> =
    this._openProjectCfg$.pipe(
      first(),
      switchMap((cfg) =>
        this._openProjectApiService.getTransitionsForIssue$(
          this.data.issue.id,
          this.data.issue.lockVersion,
          cfg,
        ),
      ),
    );

  chosenTransition?: OpenProjectOriginalStatus;
  percentageDone: number;

  constructor(
    private _openProjectApiService: OpenProjectApiService,
    private _issueService: IssueService,
    private _projectService: ProjectService,
    private _matDialogRef: MatDialogRef<DialogOpenprojectTransitionComponent>,
    private _snackService: SnackService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      issue: OpenProjectWorkPackage;
      localState: IssueLocalState;
      task: Task;
    },
  ) {
    if (!this.data.task.projectId) {
      throw new Error('No projectId for task');
    }
    this.percentageDone = data.issue.percentageDone;
  }

  transitionIssue(): void {
    if (this.chosenTransition && this.chosenTransition.id) {
      const trans: OpenProjectOriginalStatus = this.chosenTransition;

      this._openProjectCfg$
        .pipe(
          concatMap((openProjectCfg) =>
            this._openProjectApiService.transitionIssue$(
              { ...this.data.issue, percentageDone: this.percentageDone },
              trans,
              openProjectCfg,
            ),
          ),
          first(),
        )
        .subscribe(() => {
          this._issueService.refreshIssueTask(this.data.task, false, false);
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.OPEN_PROJECT.S.TRANSITION,
            translateParams: { issueKey: this.data.issue.subject, name: trans.name },
          });
          this.close();
        });
    }
  }

  close(): void {
    this._matDialogRef.close();
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }

  displayThumbWith(value: number): string {
    return `${value}%`;
  }
}
