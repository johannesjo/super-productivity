import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  input,
  signal,
} from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { IssueData, IssueProviderKey } from '../issue.model';
import { ISSUE_CONTENT_CONFIGS, IssueContentConfig } from './issue-content-config.model';
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

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() task?: TaskWithSubTasks;
  readonly issueData = input<IssueData>();

  protected isForceShowDescription = signal(false);
  protected isForceShowAllComments = signal(false);

  protected config = computed<IssueContentConfig | undefined>(() => {
    const issueType = this.task?.issueType as IssueProviderKey;
    return issueType ? ISSUE_CONTENT_CONFIGS[issueType] : undefined;
  });

  protected currentTask = computed(() => this.task);
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
    const issue = this.currentIssue() as any;
    return (
      !this.isForceShowDescription() &&
      issue?.wasUpdated === false &&
      issue?.bodyUpdated === false
    );
  });

  protected isCollapsedIssueComments = computed(() => {
    const issue = this.currentIssue() as any;
    const config = this.config();
    return (
      !this.isForceShowAllComments() &&
      config?.hasCollapsingComments &&
      issue?.commentsUpdated === false &&
      issue?.comments?.length > 1
    );
  });

  protected lastComment = computed(() => {
    const issue = this.currentIssue() as any;
    const config = this.config();
    if (!issue?.comments?.length || !config?.comments) return null;
    return issue.comments[issue.comments.length - 1];
  });

  protected getFieldValue(field: any, issue: any): any {
    if (field.getValue) {
      return field.getValue(issue);
    }

    // Handle nested fields like 'status.name'
    const keys = field.field.split('.');
    let value = issue;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  protected getFieldLink(field: any, issue: any): string {
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
    const issue = this.currentIssue() as any;
    if (!issue?.timespent) return 0;
    return issue.timespent * 1000;
  }

  protected getJiraTimeEstimate(): number {
    const issue = this.currentIssue() as any;
    if (!issue?.timeestimate) return 0;
    return issue.timeestimate * 1000;
  }

  protected hasRedmineSpentHours(): boolean {
    const issue = this.currentIssue() as any;
    return issue?.spent_hours !== undefined;
  }

  protected getRedmineSpentHours(): number {
    const issue = this.currentIssue() as any;
    return issue?.spent_hours || 0;
  }

  protected hasRedmineTotalSpentHours(): boolean {
    const issue = this.currentIssue() as any;
    return issue?.total_spent_hours !== undefined;
  }

  protected getRedmineTotalSpentHours(): number {
    const issue = this.currentIssue() as any;
    return issue?.total_spent_hours || 0;
  }

  protected hasComments(): boolean {
    const config = this.config();
    const issue = this.currentIssue() as any;
    return !!(config?.comments && issue?.[config.comments.field]?.length);
  }

  protected getCommentsLength(): number {
    const config = this.config();
    const issue = this.currentIssue() as any;
    if (!config?.comments || !issue) return 0;
    return issue[config.comments.field]?.length || 0;
  }

  protected getComments(): any[] {
    const config = this.config();
    const issue = this.currentIssue() as any;
    if (!config?.comments || !issue) return [];
    return issue[config.comments.field] || [];
  }

  constructor() {}
}
