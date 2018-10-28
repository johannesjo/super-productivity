import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { JiraIssueService } from '../jira-issue.service';

@Component({
  selector: 'issue-content',
  templateUrl: './jira-issue-content.component.html',
  styleUrls: ['./jira-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraIssueContentComponent implements OnInit {
  @Input() public task: TaskWithSubTasks;

  constructor(private readonly  _jiraIssueService: JiraIssueService) {
  }

  ngOnInit() {
  }

  hideUpdates() {
    this._jiraIssueService.update(this.task.issueId, {wasUpdated: false});
  }
}
