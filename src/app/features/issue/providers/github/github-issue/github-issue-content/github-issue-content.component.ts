import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { GithubComment, GithubIssue } from '../github-issue.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';
import { truncate } from '../../../../../../util/truncate';

@Component({
  selector: 'github-issue-content',
  templateUrl: './github-issue-content.component.html',
  styleUrls: ['./github-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class GithubIssueContentComponent {
  @Input() issue?: GithubIssue;
  @Input() task?: TaskWithSubTasks;

  T: typeof T = T;

  isForceShowAllComments = false;
  isForceShowDescription = false;

  constructor(private readonly _taskService: TaskService) {}

  lastComment(): GithubComment {
    // NOTE: when we ask for this we should have it
    return (this.issue?.comments &&
      this.issue.comments[this.issue.comments.length - 1]) as GithubComment;
  }

  isCollapsedIssueSummary(): boolean {
    if (this.issue) {
      return this.isCollapsedIssueComments() && this.issue.body.length > 200;
    }
    return false;
  }

  isCollapsedIssueComments(): boolean {
    if (this.issue) {
      return !this.isForceShowAllComments && this.issue.comments.length > 2;
    }
    return false;
  }

  hideUpdates(): void {
    if (!this.task) {
      throw new Error('No task');
    }
    if (!this.issue) {
      throw new Error('No issue');
    }
    this._taskService.markIssueUpdatesAsRead(this.task.id);
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
