import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { JiraIssueService } from '../jira-issue.service';
import { JiraApiService } from '../../jira-api.service';
import { JiraIssue } from '../jira-issue.model';
import { expandAnimation } from '../../../../ui/animations/expand.ani';
import { Attachment } from '../../../../tasks/attachment/attachment.model';

@Component({
  selector: 'jira-issue-content',
  templateUrl: './jira-issue-content.component.html',
  styleUrls: ['./jira-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraIssueContentComponent implements OnInit {
  taskData: TaskWithSubTasks;
  issueData: JiraIssue;
  attachments: Attachment[];

  @Input() set task(task: TaskWithSubTasks) {
    this.taskData = task;
    this.issueData = task.issueData as JiraIssue;
    this.attachments = this._jiraIssueService.getMappedAttachmentsFromIssue(this.issueData);
  }

  constructor(
    private readonly  _jiraIssueService: JiraIssueService,
    private readonly  _jiraApiService: JiraApiService,
  ) {
  }

  ngOnInit() {
    // TODO find better solution
    // this._jiraApiService.getIssueById(this.task.issueId, true)
    //   .then((res) => {
    //     if (res.updated !== this.task.issueData.updated) {
    //       this._jiraIssueService.update(this.task.issueId, {...res, wasUpdated: true});
    //     }
    //   });
  }

  hideUpdates() {
    this._jiraIssueService.update(this.taskData.issueId, {wasUpdated: false});
  }
}
