import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { GithubIssue } from '../github-issue.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';

@Component({
  selector: 'github-issue-content',
  templateUrl: './github-issue-content.component.html',
  styleUrls: ['./github-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GithubIssueContentComponent {
  @Input() issue?: GithubIssue;
  @Input() task?: TaskWithSubTasks;

  T: typeof T = T;

  constructor(
    private readonly  _taskService: TaskService,
  ) {
  }

  hideUpdates() {
    if (!this.task) {
      throw new Error('No task');
    }
    this._taskService.markIssueUpdatesAsRead(this.task.id);
  }

  trackByIndex(i: number, p: any) {
    return i;
  }
}
