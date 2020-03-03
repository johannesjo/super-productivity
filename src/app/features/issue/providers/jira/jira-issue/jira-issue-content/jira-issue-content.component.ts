import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TaskWithSubTasks} from '../../../../../tasks/task.model';
import {JiraIssue} from '../jira-issue.model';
import {expandAnimation} from '../../../../../../ui/animations/expand.ani';
import {Attachment} from '../../../../../attachment/attachment.model';
import {T} from '../../../../../../t.const';
import {TaskService} from '../../../../../tasks/task.service';
import * as j2m from 'jira2md';

@Component({
  selector: 'jira-issue-content',
  templateUrl: './jira-issue-content.component.html',
  styleUrls: ['./jira-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraIssueContentComponent {
  @Input('issue') set issueIn(i: JiraIssue) {
    this.issue = i;
    this.description = i && i.description && j2m.to_markdown(i.description);
  }

  issue: JiraIssue;

  @Input() task: TaskWithSubTasks;

  description: string;
  attachments: Attachment[];
  T = T;

  constructor(
    private readonly  _taskService: TaskService,
  ) {
  }

  hideUpdates() {
    this._taskService.markIssueUpdatesAsRead(this.task.id);
  }
}
