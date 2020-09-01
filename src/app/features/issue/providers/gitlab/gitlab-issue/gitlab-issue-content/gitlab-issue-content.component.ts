import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { GitlabIssue } from '../gitlab-issue.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';

@Component({
  selector: 'gitlab-issue-content',
  templateUrl: './gitlab-issue-content.component.html',
  styleUrls: ['./gitlab-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GitlabIssueContentComponent {
  @Input() issue?: GitlabIssue;
  @Input() task?: TaskWithSubTasks;

  T: typeof T = T;

  constructor(
    private readonly  _taskService: TaskService,
  ) {
  }

  hideUpdates() {
    this._taskService.markIssueUpdatesAsRead((this.task as TaskWithSubTasks).id);
  }

  trackByIndex(i: number, p: any) {
    return i;
  }
}
