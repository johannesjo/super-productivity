import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';
import { CaldavIssue } from '../caldav-issue.model';

@Component({
  selector: 'caldav-issue-content',
  templateUrl: './caldav-issue-content.component.html',
  styleUrls: ['./caldav-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class CaldavIssueContentComponent {
  @Input() issue?: CaldavIssue;
  @Input() task?: TaskWithSubTasks;

  T: typeof T = T;

  constructor(private readonly _taskService: TaskService) {}

  hideUpdates() {
    this._taskService.markIssueUpdatesAsRead((this.task as TaskWithSubTasks).id);
  }

  trackByIndex(i: number, p: any) {
    return i;
  }
}
