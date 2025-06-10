import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { IssueData, IssueProviderKey } from '../issue.model';
import { JiraIssue } from '../providers/jira/jira-issue/jira-issue.model';
import {
  ISSUE_CONTENT_CONFIGS,
  IssueContentConfig,
  IssueFieldType,
} from './issue-content-config.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownModule } from 'ngx-markdown';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TaskService } from '../../tasks/task.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { JiraToMarkdownPipe } from '../../../ui/pipes/jira-to-markdown.pipe';
import { SortPipe } from '../../../ui/pipes/sort.pipe';
import { IssueContentCustomComponent } from './issue-content-custom/issue-content-custom.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { T } from '../../../t.const';

@Component({
  selector: 'issue-content',
  templateUrl: './issue-content.component.html',
  styleUrls: ['./issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MarkdownModule,
    AsyncPipe,
    DatePipe,
    MsToStringPipe,
    JiraToMarkdownPipe,
    SortPipe,
    MatProgressBarModule,
    IssueContentCustomComponent,
  ],
  animations: [expandAnimation],
})
export class IssueContentComponent {
  private _taskService = inject(TaskService);
  private _translateService = inject(TranslateService);

  readonly IssueFieldType = IssueFieldType;

  task = input.required<TaskWithSubTasks>();
  issueData = input<IssueData>();

  isForceShowDescription = signal(false);
  isForceShowAllComments = signal(false);

  config = computed<IssueContentConfig | undefined>(() => {
    const issueType = this.task().issueType as IssueProviderKey;
    if (!ISSUE_CONTENT_CONFIGS[issueType]) {
      throw new Error(`No issue content config found for issue type: ${issueType}`);
    }
    return ISSUE_CONTENT_CONFIGS[issueType];
  });

  currentTask = computed(() => this.task());
  currentIssue = computed(() => this.issueData());

  visibleFields = computed(() => {
    const cfg = this.config();
    const issue = this.currentIssue();
    if (!cfg || !issue) return [];

    return cfg.fields.filter((field) =>
      field.isVisible ? field.isVisible(issue) : true,
    );
  });

  isCollapsedIssueSummary = computed(() => {
    const issue = this.currentIssue();
    return (
      !this.isForceShowDescription() &&
      this._hasWasUpdatedField(issue) &&
      this._hasBodyUpdatedField(issue)
    );
  });

  isCollapsedIssueComments = computed(() => {
    const issue = this.currentIssue();
    const config = this.config();
    return (
      !this.isForceShowAllComments() &&
      config?.hasCollapsingComments &&
      this._hasCommentsUpdatedField(issue) &&
      this._hasCommentsField(issue) &&
      this._getCommentsArray(issue).length > 1
    );
  });

  lastComment = computed(() => {
    const issue = this.currentIssue();
    const config = this.config();
    if (!this._hasCommentsField(issue) || !config?.comments) return null;
    const comments = this._getCommentsArray(issue);
    return comments.length > 0 ? comments[comments.length - 1] : null;
  });

  hasComments = computed(() => {
    const issue = this.currentIssue();
    return this._hasCommentsField(issue) && this._getCommentsArray(issue).length > 0;
  });

  commentsLength = computed(() => {
    const issue = this.currentIssue();
    return this._getCommentsArray(issue).length;
  });

  comments = computed(() => {
    const issue = this.currentIssue();
    return this._getCommentsArray(issue);
  });

  getFieldValue(field: any, issue: IssueData | undefined): any {
    if (!issue) return undefined;

    if (field.getValue) {
      return field.getValue(issue);
    }

    // Handle nested fields like 'status.name'
    const keys = field.field.split('.');
    let value: any = issue;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  getFieldLink(field: any, issue: IssueData | undefined): string {
    if (!issue) return '';

    if (field.getLink) {
      return field.getLink(issue);
    }
    return '';
  }

  getCommentAuthor(comment: any, config: IssueContentConfig): string {
    const keys = config.comments!.authorField.split('.');
    let value = comment;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || '';
  }

  getCommentBody(comment: any, config: IssueContentConfig): string {
    return comment[config.comments!.bodyField] || '';
  }

  getCommentCreated(comment: any, config: IssueContentConfig): string {
    return comment[config.comments!.createdField] || '';
  }

  getCommentAvatar(comment: any, config: IssueContentConfig): string | undefined {
    if (!config.comments?.avatarField) return undefined;

    const keys = config.comments.avatarField.split('.');
    let value = comment;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Type guard functions
  private _isJiraIssue(issue: IssueData | undefined): issue is JiraIssue {
    return !!issue && 'timespent' in issue && 'timeestimate' in issue;
  }

  private _hasWasUpdatedField(issue: IssueData | undefined): boolean {
    return !!issue && 'wasUpdated' in issue && (issue as any).wasUpdated === false;
  }

  private _hasBodyUpdatedField(issue: IssueData | undefined): boolean {
    return !!issue && 'bodyUpdated' in issue && (issue as any).bodyUpdated === false;
  }

  private _hasCommentsUpdatedField(issue: IssueData | undefined): boolean {
    return (
      !!issue && 'commentsUpdated' in issue && (issue as any).commentsUpdated === false
    );
  }

  private _hasCommentsField(issue: IssueData | undefined): boolean {
    const config = this.config();
    if (!config?.comments || !issue) return false;
    return (
      config.comments.field in issue &&
      Array.isArray((issue as any)[config.comments.field])
    );
  }

  private _getCommentsArray(issue: IssueData | undefined): any[] {
    const config = this.config();
    if (!config?.comments || !issue) return [];
    const comments = (issue as any)[config.comments.field];
    return Array.isArray(comments) ? comments : [];
  }

  hideUpdates(): void {
    const task = this.currentTask();
    if (task?.id && task?.issueId) {
      this._taskService.markIssueUpdatesAsRead(task.id);
    }
  }

  showAllContent(): void {
    this.isForceShowDescription.set(true);
    this.isForceShowAllComments.set(true);
  }

  // TODO replace with translation pipe
  t(key: string, params?: any): string {
    return this._translateService.instant(key, params);
  }

  protected readonly T = T;
}
