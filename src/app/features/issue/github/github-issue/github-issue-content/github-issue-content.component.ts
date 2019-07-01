import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {TaskWithSubTasks} from '../../../../tasks/task.model';
import {GithubIssueService} from '../github-issue.service';
import {GithubApiService} from '../../github-api.service';
import {GithubIssue} from '../github-issue.model';
import {expandAnimation} from '../../../../../ui/animations/expand.ani';

@Component({
  selector: 'github-issue-content',
  templateUrl: './github-issue-content.component.html',
  styleUrls: ['./github-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GithubIssueContentComponent implements OnInit {
  taskData: TaskWithSubTasks;
  issueData: GithubIssue;

  constructor(
    private readonly  _githubIssueService: GithubIssueService,
    private readonly  _githubApiService: GithubApiService,
  ) {
  }

  @Input() set task(task: TaskWithSubTasks) {
    this.taskData = task;
    this.issueData = task.issueData as GithubIssue;
  }

  ngOnInit() {
    // TODO find better solution
    // this._githubApiService.getIssueById(this.task.issueId, true)
    //   .then((res) => {
    //     if (res.updated !== this.task.issueData.updated) {
    //       this._githubIssueService.update(this.task.issueId, {...res, wasUpdated: true});
    //     }
    //   });
  }

  hideUpdates() {
    this._githubIssueService.update(+this.taskData.issueId, {wasUpdated: false});
  }
}
