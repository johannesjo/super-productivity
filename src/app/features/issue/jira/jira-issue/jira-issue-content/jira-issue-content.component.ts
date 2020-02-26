import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy} from '@angular/core';
import {TaskWithSubTasks} from '../../../../tasks/task.model';
import {JiraIssueService} from '../jira-issue.service';
import {JiraApiService} from '../../jira-api.service';
import {JiraIssue} from '../jira-issue.model';
import {expandAnimation} from '../../../../../ui/animations/expand.ani';
import {Attachment} from '../../../../attachment/attachment.model';
import {T} from '../../../../../t.const';
import * as j2m from 'jira2md';
import {Subscription} from 'rxjs';
import {JIRA_TYPE} from '../../../issue.const';
import {TaskService} from '../../../../tasks/task.service';

@Component({
  selector: 'jira-issue-content',
  templateUrl: './jira-issue-content.component.html',
  styleUrls: ['./jira-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class JiraIssueContentComponent implements OnDestroy {

  description: string;
  attachments: Attachment[];
  isFocusDescription = false;
  T = T;
  issue: JiraIssue;
  taskData: TaskWithSubTasks;

  private _taskId: string;
  private _getIssueSub = new Subscription();
  private _lastUpdated: number;


  @Input()
  private set task(task: TaskWithSubTasks) {
    if (!task || task.issueType !== JIRA_TYPE) {
      throw new Error('No task set on init or no Jira Task');
    } else if (task && task.id !== this._taskId) {
      this.issue = null;
      this._loadIssueData(task.issueId);
    } else if (task.issueWasUpdated === true && !this.taskData.issueWasUpdated) {
      this.issue = null;
      this._loadIssueData(task.issueId);
    }

    this.taskData = task;
    this._taskId = task.id;
  }

  constructor(
    private readonly  _jiraIssueService: JiraIssueService,
    private readonly  _jiraApiService: JiraApiService,
    private readonly  _taskService: TaskService,
    private readonly  _changeDetectorRef: ChangeDetectorRef,
  ) {
  }

  ngOnDestroy(): void {
    this._getIssueSub.unsubscribe();
  }

  hideUpdates() {
    // TODO replace with a dedicated method
    this._taskService.update(this.taskData.id, {issueWasUpdated: false});
  }

  private _loadIssueData(issueId: string) {
    this._getIssueSub.unsubscribe();
    this._getIssueSub = new Subscription();
    this._getIssueSub.add(this._jiraApiService.getIssueById$(issueId).subscribe((issue) => {
      this.issue = issue;
      this.description = issue && issue.description && j2m.to_markdown(issue.description);
      this.attachments = this._jiraIssueService.getMappedAttachmentsFromIssue(issue);
      this._changeDetectorRef.detectChanges();
    }));
  }
}
