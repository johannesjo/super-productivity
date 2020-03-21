import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {IssueLocalState} from '../../../../issue.model';
import {JiraIssueReduced} from '../../jira-issue/jira-issue.model';
import {Observable} from 'rxjs';
import {JiraApiService} from '../../jira-api.service';
import {JiraOriginalTransition} from '../../jira-api-responses';
import {SnackService} from '../../../../../../core/snack/snack.service';
import {take} from 'rxjs/operators';
import {T} from '../../../../../../t.const';
import {Task} from '../../../../../tasks/task.model';
import {JiraCommonInterfacesService} from '../../jira-common-interfaces.service';

@Component({
  selector: 'dialog-jira-transition',
  templateUrl: './dialog-jira-transition.component.html',
  styleUrls: ['./dialog-jira-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraTransitionComponent {
  T = T;
  availableTransitions$: Observable<JiraOriginalTransition[]> = this._jiraApiService.getTransitionsForIssue$(this.data.issue.id);

  chosenTransition: JiraOriginalTransition;

  constructor(
    private _jiraApiService: JiraApiService,
    private _jiraCommonInterfacesService: JiraCommonInterfacesService,
    private _matDialogRef: MatDialogRef<DialogJiraTransitionComponent>,
    private _snackService: SnackService,
    @Inject(MAT_DIALOG_DATA) public data: {
      issue: JiraIssueReduced,
      localState: IssueLocalState,
      task: Task,
    }
  ) {
  }

  close() {
    this._matDialogRef.close();
  }

  transitionIssue() {
    if (this.chosenTransition && this.chosenTransition.id) {
      this._jiraApiService.transitionIssue$(this.data.issue.id, this.chosenTransition.id)
        .pipe(take(1))
        .subscribe(() => {
          this._jiraCommonInterfacesService.refreshIssue(this.data.task, false, false);
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.JIRA.S.TRANSITION,
            translateParams: {issueKey: this.data.issue.key, name: this.chosenTransition.name}
          });
          this.close();
        });
    }
  }
}
