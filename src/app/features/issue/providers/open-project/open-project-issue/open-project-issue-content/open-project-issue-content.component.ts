import { ChangeDetectionStrategy, Component, Input, input, inject } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { OpenProjectWorkPackage } from '../open-project-issue.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';
import { MatButton } from '@angular/material/button';
import { MarkdownComponent } from 'ngx-markdown';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'open-project-issue-content',
  templateUrl: './open-project-issue-content.component.html',
  styleUrls: ['./open-project-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  imports: [MatButton, MarkdownComponent, TranslatePipe],
})
export class OpenProjectIssueContentComponent {
  private readonly _taskService = inject(TaskService);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() issue?: OpenProjectWorkPackage;
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

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
