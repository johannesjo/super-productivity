import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy} from '@angular/core';
import {TaskWithSubTasks} from '../../../../tasks/task.model';
import {JiraApiService} from '../../jira-api.service';
import {JiraIssue} from '../jira-issue.model';
import {expandAnimation} from '../../../../../ui/animations/expand.ani';
import {Attachment} from '../../../../attachment/attachment.model';
import {T} from '../../../../../t.const';
import {Subscription} from 'rxjs';
import {TaskService} from '../../../../tasks/task.service';
import {JiraCommonInterfacesService} from '../../jira-common-interfaces.service';

@Component({
  selector: 'jira-issue-content',
  templateUrl: './jira-issue-content.component.html',
  styleUrls: ['./jira-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraIssueContentComponent implements OnDestroy {
  @Input() issue: JiraIssue;
  @Input() task: TaskWithSubTasks;

  description: string;
  attachments: Attachment[];
  T = T;

  private _getIssueSub = new Subscription();


  constructor(
    private readonly  _jiraCommonInterfacesService: JiraCommonInterfacesService,
    private readonly  _jiraApiService: JiraApiService,
    private readonly  _taskService: TaskService,
    private readonly  _changeDetectorRef: ChangeDetectorRef,
  ) {
  }

  ngOnDestroy(): void {
    this._getIssueSub.unsubscribe();
  }

  hideUpdates() {
    this._taskService.markIssueUpdatesAsRead(this.task.id);
  }
}
