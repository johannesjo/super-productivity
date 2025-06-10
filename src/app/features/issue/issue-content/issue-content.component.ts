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
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { TaskService } from '../../tasks/task.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { JiraToMarkdownPipe } from '../../../ui/pipes/jira-to-markdown.pipe';
import { SortPipe } from '../../../ui/pipes/sort.pipe';

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
    NgClass,
    MsToStringPipe,
    JiraToMarkdownPipe,
    SortPipe,
  ],
  animations: [expandAnimation],
})
export class IssueContentComponent {
  private _taskService = inject(TaskService);
  private _translateService = inject(TranslateService);

  protected readonly IssueFieldType = IssueFieldType;

  readonly task = input.required<TaskWithSubTasks>();
  readonly issueData = input<IssueData>();

  protected isForceShowDescription = signal(false);
  protected isForceShowAllComments = signal(false);

  protected config = computed<IssueContentConfig | undefined>(() => {
    const issueType = this.task().issueType as IssueProviderKey;
    return issueType ? ISSUE_CONTENT_CONFIGS[issueType] : undefined;
  });

  protected currentTask = computed(() => this.task());
  protected currentIssue = computed(() => this.issueData());

  protected visibleFields = computed(() => {
    const cfg = this.config();
    const issue = this.currentIssue();
    if (!cfg || !issue) return [];

    return cfg.fields.filter((field) =>
      field.isVisible ? field.isVisible(issue) : true,
    );
  });

  protected isCollapsedIssueSummary = computed(() => {
    const issue = this.currentIssue();
    return (
      !this.isForceShowDescription() &&
      this.hasWasUpdatedField(issue) &&
      this.hasBodyUpdatedField(issue)
    );
  });

  protected isCollapsedIssueComments = computed(() => {
    const issue = this.currentIssue();
    const config = this.config();
    return (
      !this.isForceShowAllComments() &&
      config?.hasCollapsingComments &&
      this.hasCommentsUpdatedField(issue) &&
      this.hasCommentsField(issue) &&
      this.getCommentsArray(issue).length > 1
    );
  });

  protected lastComment = computed(() => {
    const issue = this.currentIssue();
    const config = this.config();
    if (!this.hasCommentsField(issue) || !config?.comments) return null;
    const comments = this.getCommentsArray(issue);
    return comments.length > 0 ? comments[comments.length - 1] : null;
  });

  protected getFieldValue(field: any, issue: IssueData | undefined): any {
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

  protected getFieldLink(field: any, issue: IssueData | undefined): string {
    if (!issue) return '';

    if (field.getLink) {
      return field.getLink(issue);
    }
    return '';
  }

  protected getCommentAuthor(comment: any, config: IssueContentConfig): string {
    const keys = config.comments!.authorField.split('.');
    let value = comment;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || '';
  }

  protected getCommentBody(comment: any, config: IssueContentConfig): string {
    return comment[config.comments!.bodyField] || '';
  }

  protected getCommentCreated(comment: any, config: IssueContentConfig): string {
    return comment[config.comments!.createdField] || '';
  }

  protected getCommentAvatar(
    comment: any,
    config: IssueContentConfig,
  ): string | undefined {
    if (!config.comments?.avatarField) return undefined;

    const keys = config.comments.avatarField.split('.');
    let value = comment;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  // Type guard functions
  private isJiraIssue(issue: IssueData | undefined): issue is JiraIssue {
    return !!issue && 'timespent' in issue && 'timeestimate' in issue;
  }

  private isRedmineIssue(issue: IssueData | undefined): boolean {
    return !!issue && 'tracker' in issue && 'status' in issue && 'priority' in issue;
  }

  private hasWasUpdatedField(issue: IssueData | undefined): boolean {
    return !!issue && 'wasUpdated' in issue && (issue as any).wasUpdated === false;
  }

  private hasBodyUpdatedField(issue: IssueData | undefined): boolean {
    return !!issue && 'bodyUpdated' in issue && (issue as any).bodyUpdated === false;
  }

  private hasCommentsUpdatedField(issue: IssueData | undefined): boolean {
    return (
      !!issue && 'commentsUpdated' in issue && (issue as any).commentsUpdated === false
    );
  }

  private hasCommentsField(issue: IssueData | undefined): boolean {
    const config = this.config();
    if (!config?.comments || !issue) return false;
    return (
      config.comments.field in issue &&
      Array.isArray((issue as any)[config.comments.field])
    );
  }

  private getCommentsArray(issue: IssueData | undefined): any[] {
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

  translate(key: string, params?: any): string {
    return this._translateService.instant(key, params);
  }

  protected getJiraTimeSpent(): number {
    const issue = this.currentIssue();
    if (!this.isJiraIssue(issue) || !issue.timespent) return 0;
    return (issue as JiraIssue).timespent * 1000;
  }

  protected getJiraTimeEstimate(): number {
    const issue = this.currentIssue();
    if (!this.isJiraIssue(issue) || !issue.timeestimate) return 0;
    return (issue as JiraIssue).timeestimate * 1000;
  }

  protected hasRedmineSpentHours(): boolean {
    const issue = this.currentIssue();
    return !!issue && 'spent_hours' in issue && (issue as any).spent_hours !== undefined;
  }

  protected getRedmineSpentHours(): number {
    const issue = this.currentIssue();
    if (!issue || !('spent_hours' in issue)) return 0;
    return (issue as any).spent_hours || 0;
  }

  protected hasRedmineTotalSpentHours(): boolean {
    const issue = this.currentIssue();
    return (
      !!issue &&
      'total_spent_hours' in issue &&
      (issue as any).total_spent_hours !== undefined
    );
  }

  protected getRedmineTotalSpentHours(): number {
    const issue = this.currentIssue();
    if (!issue || !('total_spent_hours' in issue)) return 0;
    return (issue as any).total_spent_hours || 0;
  }

  protected hasComments(): boolean {
    const issue = this.currentIssue();
    return this.hasCommentsField(issue) && this.getCommentsArray(issue).length > 0;
  }

  protected getCommentsLength(): number {
    const issue = this.currentIssue();
    return this.getCommentsArray(issue).length;
  }

  protected getComments(): any[] {
    const issue = this.currentIssue();
    return this.getCommentsArray(issue);
  }

  constructor() {}
}
