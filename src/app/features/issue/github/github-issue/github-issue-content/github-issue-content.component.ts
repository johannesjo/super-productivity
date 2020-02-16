import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TaskWithSubTasks} from '../../../../tasks/task.model';
import {GithubApiService} from '../../github-api.service';
import {GithubIssue} from '../github-issue.model';
import {expandAnimation} from '../../../../../ui/animations/expand.ani';
import {T} from '../../../../../t.const';
import {Observable, ReplaySubject} from 'rxjs';
import {switchMap} from 'rxjs/operators';

@Component({
  selector: 'github-issue-content',
  templateUrl: './github-issue-content.component.html',
  styleUrls: ['./github-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GithubIssueContentComponent {
  T = T;
  taskData: TaskWithSubTasks;
  task$ = new ReplaySubject<TaskWithSubTasks>(1);
  issueData$: Observable<GithubIssue> = this.task$.pipe(switchMap(task => {
    const issueId = +task.issueId;
    return this._githubApiService.getById$(issueId);
  }));

  constructor(
    private readonly  _githubApiService: GithubApiService,
  ) {
  }

  @Input() set task(task: TaskWithSubTasks) {
    this.taskData = task;
    this.task$.next(task);
  }

  hideUpdates() {
    // TODO should be on task data level
    alert('NOT IMPLEMENTED');
    // this._githubIssueService.update(+this.taskData.issueId, {wasUpdated: false});
  }
}
