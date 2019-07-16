import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {TaskWithSubTasks} from '../../../../tasks/task.model';
import {T} from '../../../../../t.const';

@Component({
  selector: 'github-issue-header',
  templateUrl: './github-issue-header.component.html',
  styleUrls: ['./github-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GithubIssueHeaderComponent implements OnInit {
  T = T;
  @Input() public task: TaskWithSubTasks;

  constructor() {
  }

  ngOnInit() {
  }

}
