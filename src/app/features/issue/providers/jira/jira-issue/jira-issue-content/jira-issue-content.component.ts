import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { JiraIssue } from '../jira-issue.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { TaskAttachment } from '../../../../../tasks/task-attachment/task-attachment.model';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';
// @ts-ignore
import * as j2m from 'jira2md';
import { JiraCommonInterfacesService } from '../../jira-common-interfaces.service';
import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'jira-issue-content',
  templateUrl: './jira-issue-content.component.html',
  styleUrls: ['./jira-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraIssueContentComponent {
  description?: string;
  attachments?: TaskAttachment[];
  T: typeof T = T;
  issue?: JiraIssue;
  task?: TaskWithSubTasks;
  private _task$: ReplaySubject<TaskWithSubTasks> = new ReplaySubject(1);
  issueUrl$: Observable<string> = this._task$.pipe(
    switchMap((task) => this._jiraCommonInterfacesService.issueLink$(task.issueId as string, task.projectId as string))
  );

  constructor(
    private readonly  _taskService: TaskService,
    private readonly  _jiraCommonInterfacesService: JiraCommonInterfacesService,
  ) {
  }

  @Input('issue') set issueIn(i: JiraIssue) {
    this.issue = i;
    this.description = i && i.description && j2m.to_markdown(i.description);
  }

  @Input('task') set taskIn(v: TaskWithSubTasks) {
    this.task = v;
    this._task$.next(v);
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
