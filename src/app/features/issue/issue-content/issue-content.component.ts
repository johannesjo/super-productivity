import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {TaskWithSubTasks} from '../../tasks/task.model';
import {GITHUB_TYPE, JIRA_TYPE, GITLAB_TYPE} from '../issue.const';
import {IssueData} from '../issue.model';

@Component({
  selector: 'issue-content',
  templateUrl: './issue-content.component.html',
  styleUrls: ['./issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueContentComponent implements OnInit {
  @Input() task: TaskWithSubTasks;
  @Input() issueData: IssueData;
  GITLAB_TYPE = GITLAB_TYPE;
  GITHUB_TYPE = GITHUB_TYPE;
  JIRA_TYPE = JIRA_TYPE;

  constructor() {
  }

  ngOnInit() {
  }

}
