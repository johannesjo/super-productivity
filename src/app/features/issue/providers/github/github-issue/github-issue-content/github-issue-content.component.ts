import { ChangeDetectionStrategy, Component, Input, input, inject } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { GithubComment, GithubIssue } from '../github-issue.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MarkdownComponent, MarkdownPipe } from 'ngx-markdown';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe, DatePipe } from '@angular/common';
import { SortPipe } from '../../../../../../ui/pipes/sort.pipe';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'github-issue-content',
  templateUrl: './github-issue-content.component.html',
  styleUrls: ['./github-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  imports: [
    MatButton,
    MatChipListbox,
    MatChipOption,
    MarkdownComponent,
    MatIcon,
    MatAnchor,
    AsyncPipe,
    DatePipe,
    SortPipe,
    TranslatePipe,
    MarkdownPipe,
  ],
})
export class GithubIssueContentComponent {
  private readonly _taskService = inject(TaskService);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() issue?: GithubIssue;
  readonly task = input<TaskWithSubTasks>();

  T: typeof T = T;

  isForceShowAllComments = false;
  isForceShowDescription = false;

  lastComment(): GithubComment {
    // NOTE: when we ask for this we should have it
    return (this.issue?.comments &&
      this.issue.comments[this.issue.comments?.length - 1]) as GithubComment;
  }

  isCollapsedIssueSummary(): boolean {
    if (this.issue) {
      return this.isCollapsedIssueComments() && this.issue.body?.length > 200;
    }
    return false;
  }

  isCollapsedIssueComments(): boolean {
    if (this.issue) {
      return !this.isForceShowAllComments && this.issue.comments?.length > 2;
    }
    return false;
  }

  hideUpdates(): void {
    const task = this.task();
    if (!task) {
      throw new Error('No task');
    }
    if (!this.issue) {
      throw new Error('No issue');
    }
    this._taskService.markIssueUpdatesAsRead(task.id);
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
