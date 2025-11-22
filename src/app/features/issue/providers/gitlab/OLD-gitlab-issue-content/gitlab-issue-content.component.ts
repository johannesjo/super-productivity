import { ChangeDetectionStrategy, Component, Input, input, inject } from '@angular/core';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { GitlabComment, GitlabIssue } from '../gitlab-issue.model';
import { expandAnimation } from '../../../../../ui/animations/expand.ani';
import { T } from '../../../../../t.const';
import { TaskService } from '../../../../tasks/task.service';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MarkdownComponent, MarkdownPipe } from 'ngx-markdown';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'gitlab-issue-content',
  templateUrl: './gitlab-issue-content.component.html',
  styleUrls: ['./gitlab-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  imports: [
    MatButton,
    MatChipListbox,
    MatChipOption,
    MarkdownComponent,
    MatAnchor,
    MatIcon,
    AsyncPipe,
    LocaleDatePipe,
    TranslatePipe,
    MarkdownPipe,
  ],
})
export class GitlabIssueContentComponent {
  private readonly _taskService = inject(TaskService);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() issue?: GitlabIssue;
  readonly task = input<TaskWithSubTasks>();

  T: typeof T = T;

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

  trackByIndex(i: number, p: GitlabComment): number {
    return i;
  }

  get sortedComments(): GitlabComment[] {
    if (!this.issue?.comments) {
      return [];
    }
    return [...this.issue.comments].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }
}
