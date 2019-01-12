import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';

@Component({
  selector: 'issue-header',
  templateUrl: './issue-header.component.html',
  styleUrls: ['./issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueHeaderComponent implements OnInit {
  @Input() task: TaskWithSubTasks;

  constructor() {
  }

  ngOnInit() {
  }

}
