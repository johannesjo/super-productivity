import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { TaskWithAllData } from '../../../../tasks/task.model';

@Component({
  selector: 'issue-header.issue-tab-header',
  templateUrl: './jira-issue-header.component.html',
  styleUrls: ['./jira-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraIssueHeaderComponent implements OnInit {
  @Input() public task: TaskWithAllData;

  constructor() {
  }

  ngOnInit() {
  }

}
