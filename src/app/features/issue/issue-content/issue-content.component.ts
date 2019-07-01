import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {TaskWithSubTasks} from '../../tasks/task.model';
import {GITHUB_TYPE, JIRA_TYPE} from '../issue.const';

@Component({
  selector: 'issue-content',
  templateUrl: './issue-content.component.html',
  styleUrls: ['./issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueContentComponent implements OnInit {
  @Input() task: TaskWithSubTasks;
  GITHUB_TYPE = GITHUB_TYPE;
  JIRA_TYPE = JIRA_TYPE;

  constructor() {
  }

  ngOnInit() {
  }

}
