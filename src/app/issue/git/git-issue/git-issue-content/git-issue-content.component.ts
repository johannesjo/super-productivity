import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { GitIssueService } from '../git-issue.service';
import { GitApiService } from '../../git-api.service';
import { GitIssue } from '../git-issue.model';
import { expandAnimation } from '../../../../ui/animations/expand.ani';

@Component({
  selector: 'git-issue-content',
  templateUrl: './git-issue-content.component.html',
  styleUrls: ['./git-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GitIssueContentComponent implements OnInit {
  taskData: TaskWithSubTasks;
  issueData: GitIssue;

  @Input() set task(task: TaskWithSubTasks) {
    this.taskData = task;
    this.issueData = task.issueData as GitIssue;
  }

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
    this._gitIssueService.update(+this.taskData.issueId, {wasUpdated: false});
  }
}
