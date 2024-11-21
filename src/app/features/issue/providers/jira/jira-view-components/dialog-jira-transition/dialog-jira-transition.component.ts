import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IssueLocalState, IssueProviderJira } from '../../../../issue.model';
import { JiraIssueReduced } from '../../jira-issue/jira-issue.model';
import { Observable } from 'rxjs';
import { JiraApiService } from '../../jira-api.service';
import { JiraOriginalTransition } from '../../jira-api-responses';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { concatMap, first, switchMap } from 'rxjs/operators';
import { T } from '../../../../../../t.const';
import { Task } from '../../../../../tasks/task.model';
import { IssueService } from '../../../../issue.service';
import { IssueProviderService } from '../../../../issue-provider.service';

@Component({
  selector: 'dialog-jira-transition',
  templateUrl: './dialog-jira-transition.component.html',
  styleUrls: ['./dialog-jira-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogJiraTransitionComponent {
  T: typeof T = T;

  _jiraCfg$: Observable<IssueProviderJira> = this._issueProviderService.getCfgOnce$(
    this.data.task.issueProviderId!,
    'JIRA',
  );

  availableTransitions$: Observable<JiraOriginalTransition[]> = this._jiraCfg$.pipe(
    first(),
    switchMap((cfg) =>
      this._jiraApiService.getTransitionsForIssue$(this.data.issue.id, cfg),
    ),
  );

  chosenTransition?: JiraOriginalTransition;

  constructor(
    private _jiraApiService: JiraApiService,
    private _issueService: IssueService,
    private _issueProviderService: IssueProviderService,
    private _matDialogRef: MatDialogRef<DialogJiraTransitionComponent>,
    private _snackService: SnackService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      issue: JiraIssueReduced;
      localState: IssueLocalState;
      task: Task;
    },
  ) {
    if (!this.data.task.issueProviderId) {
      throw new Error('No issueProviderId for task');
    }
  }

  close(): void {
    this._matDialogRef.close();
  }

  transitionIssue(): void {
    if (this.chosenTransition && this.chosenTransition.id) {
      const trans: JiraOriginalTransition = this.chosenTransition;

      this._jiraCfg$
        .pipe(
          concatMap((jiraCfg) =>
            this._jiraApiService.transitionIssue$(this.data.issue.id, trans.id, jiraCfg),
          ),
          first(),
        )
        .subscribe(() => {
          this._issueService.refreshIssueTask(this.data.task, false, false);
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.JIRA.S.TRANSITION,
            translateParams: { issueKey: this.data.issue.key, name: trans.name },
          });
          this.close();
        });
    }
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
