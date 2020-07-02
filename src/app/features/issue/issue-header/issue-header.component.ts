import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE } from '../issue.const';

@Component({
  selector: 'issue-header',
  templateUrl: './issue-header.component.html',
  styleUrls: ['./issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueHeaderComponent implements OnInit {
  @Input() task: TaskWithSubTasks;

  GITLAB_TYPE = GITLAB_TYPE;
  GITHUB_TYPE = GITHUB_TYPE;
  JIRA_TYPE = JIRA_TYPE;

  constructor() {
  }

  ngOnInit() {
  }

}
