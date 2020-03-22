import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { T } from 'src/app/t.const';
import { TaskWithSubTasks } from 'src/app/features/tasks/task.model';

@Component({
  selector: 'gitlab-issue-header',
  templateUrl: './gitlab-issue-header.component.html',
  styleUrls: ['./gitlab-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GitlabIssueHeaderComponent implements OnInit {
  T = T;
  @Input() public task: TaskWithSubTasks;

  constructor() { }

  ngOnInit() {
    console.log('=========================');
    console.log(this.task);
  }

}
