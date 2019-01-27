import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../../../tasks/task.model';

@Component({
  selector: 'git-issue-header',
  templateUrl: './git-issue-header.component.html',
  styleUrls: ['./git-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GitIssueHeaderComponent implements OnInit {
  @Input() public task: TaskWithSubTasks;

  constructor() {
  }

  ngOnInit() {
  }

}
