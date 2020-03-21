import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TaskWithSubTasks} from '../../../../../tasks/task.model';
import {JiraIssue} from '../jira-issue.model';
import {expandAnimation} from '../../../../../../ui/animations/expand.ani';
import {TaskAttachment} from '../../../../../tasks/task-attachment/task-attachment.model';
import {T} from '../../../../../../t.const';
import {TaskService} from '../../../../../tasks/task.service';
import * as j2m from 'jira2md';
import {IssueService} from '../../../../issue.service';
import {JIRA_TYPE} from '../../../../issue.const';

@Component({
  selector: 'jira-issue-content',
  templateUrl: './jira-issue-content.component.html',
  styleUrls: ['./jira-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraIssueContentComponent {
  issue: JiraIssue;
  issueUrl: string;
  @Input() task: TaskWithSubTasks;
  description: string;
  attachments: TaskAttachment[];
  T = T;

  constructor(
    private readonly  _taskService: TaskService,
    private readonly  _issueService: IssueService,
  ) {
  }

  @Input('issue') set issueIn(i: JiraIssue) {
    this.issue = i;
    this.description = i && i.description && j2m.to_markdown(i.description);
    // TODO fix
    // this.issueUrl = this._issueService.issueLink$(JIRA_TYPE, i.id);
  }

  getIssueLink$(id) {
    // this._issueService.issueLink$(JIRA_TYPE, i.id)
  }

  hideUpdates() {
    this._taskService.markIssueUpdatesAsRead(this.task.id);
  }
}
