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
import {
  IssueContentConfig,
  IssueFieldConfig,
  IssueFieldType,
  IssueComment,
} from './issue-content.model';
import { ISSUE_CONTENT_CONFIGS } from './issue-content-configs.const';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownModule } from 'ngx-markdown';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TaskService } from '../../tasks/task.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { IssueContentCustomComponent } from './issue-content-custom/issue-content-custom.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { JiraToMarkdownPipe } from '../../../ui/pipes/jira-to-markdown.pipe';
import { SortPipe } from '../../../ui/pipes/sort.pipe';
import { T } from '../../../t.const';
import { devError } from '../../../util/dev-error';

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
    MatProgressBarModule,
    JiraToMarkdownPipe,
    SortPipe,
    IssueContentCustomComponent,
  ],
  animations: [expandAnimation],
})
export class IssueContentComponent {
  private _taskService = inject(TaskService);
  protected readonly T = T;

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
    return !this.isForceShowDescription() && this.task().issueWasUpdated;
  });

  isCollapsedIssueComments = computed(() => {
    const issue = this.currentIssue();
    const config = this.config();
    return (
      !this.isForceShowAllComments() &&
      config?.hasCollapsingComments &&
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

  getFieldValue(field: IssueFieldConfig<IssueData>, issue: IssueData | undefined): any {
    if (!issue) return undefined;

    try {
      if (typeof field.value === 'function') {
        return field.value(issue);
      }

      // Handle nested fields like 'status.name'
      const keys = field.value.split('.');
      let value: any = issue;
      for (const key of keys) {
        value = value?.[key];
      }
      return value;
    } catch (error) {
      devError(error);
    }
  }

  getFieldLink(field: IssueFieldConfig<IssueData>, issue: IssueData | undefined): string {
    if (!issue) return '';

    if (field.getLink) {
      return field.getLink(issue);
    }
    return '';
  }

  getCommentAuthor(comment: IssueComment | null, cfg: IssueContentConfig): string {
    if (!comment) return '';
    const keys = cfg.comments!.authorField.split('.');
    let value: any = comment;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || '';
  }

  getCommentBody(comment: IssueComment | null, cfg: IssueContentConfig): string {
    if (!comment) return '';
    return comment[cfg.comments!.bodyField] || '';
  }

  getCommentCreated(comment: IssueComment | null, cfg: IssueContentConfig): string {
    if (!comment) return '';
    return comment[cfg.comments!.createdField] || '';
  }

  getCommentAvatar(
    comment: IssueComment | null,
    cfg: IssueContentConfig,
  ): string | undefined {
    if (!comment || !cfg.comments?.avatarField) return undefined;

    const keys = cfg.comments.avatarField.split('.');
    let value: any = comment;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private _hasCommentsField(issue: IssueData | undefined): boolean {
    const config = this.config();
    if (!config?.comments || !issue) return false;
    return (
      config.comments.field in issue &&
      Array.isArray((issue as any)[config.comments.field])
    );
  }

  private _getCommentsArray(issue: IssueData | undefined): IssueComment[] {
    const config = this.config();
    if (!config?.comments || !issue) return [];
    const comments = issue[config.comments.field];
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
}
