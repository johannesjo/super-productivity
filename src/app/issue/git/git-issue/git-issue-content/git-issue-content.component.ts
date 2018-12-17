import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { GitIssueService } from '../git-issue.service';
import { GitApiService } from '../../git-api.service';

@Component({
  selector: 'git-issue-content',
  templateUrl: './git-issue-content.component.html',
  styleUrls: ['./git-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GitIssueContentComponent implements OnInit {
  @Input() public task: TaskWithSubTasks;

  constructor(
    private readonly  _gitIssueService: GitIssueService,
    private readonly  _gitApiService: GitApiService,
  ) {
  }

  ngOnInit() {
    // TODO find better solution
    // this._gitApiService.getIssueById(this.task.issueId, true)
    //   .then((res) => {
    //     if (res.updated !== this.task.issueData.updated) {
    //       this._gitIssueService.update(this.task.issueId, {...res, wasUpdated: true});
    //     }
    //   });
  }

  hideUpdates() {
    this._gitIssueService.update(this.task.issueId, {wasUpdated: false});
  }
}
