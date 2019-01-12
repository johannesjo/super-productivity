import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';

@Component({
  selector: 'issue-content',
  templateUrl: './issue-content.component.html',
  styleUrls: ['./issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueContentComponent implements OnInit {
  @Input() task: TaskWithSubTasks;

  constructor() {
  }

  ngOnInit() {
  }

}
