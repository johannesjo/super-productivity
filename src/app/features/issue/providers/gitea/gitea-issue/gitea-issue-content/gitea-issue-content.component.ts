import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { TaskWithSubTasks } from 'src/app/features/tasks/task.model';
import { TaskService } from 'src/app/features/tasks/task.service';
import { T } from 'src/app/t.const';
import { expandAnimation } from 'src/app/ui/animations/expand.ani';
import { GiteaIssue } from '../gitea-issue.model';

@Component({
  selector: 'gitea-issue-content',
  templateUrl: './gitea-issue-content.component.html',
  styleUrls: ['./gitea-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  standalone: false,
})
export class GiteaIssueContentComponent {
  @Input() issue?: GiteaIssue;
  @Input() task?: TaskWithSubTasks;

  T: typeof T = T;

  constructor(private readonly _taskService: TaskService) {}

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
