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
import { JiraCommonInterfacesService } from '../providers/jira/jira-common-interfaces.service';
import { of } from 'rxjs';
import { IssueProviderService } from '../issue-provider.service';
import { OpenProjectApiService } from '../providers/open-project/open-project-api.service';
import { SnackService } from '../../../core/snack/snack.service';
import { TaskAttachment } from '../../tasks/task-attachment/task-attachment.model';
import { mapOpenProjectAttachmentToTaskAttachment } from '../providers/open-project/open-project-issue/open-project-issue-map.util';
import { OpenProjectWorkPackage } from '../providers/open-project/open-project-issue/open-project-issue.model';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import moment from 'moment';
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
  ],
  animations: [expandAnimation],
})
export class IssueContentComponent {
  private _taskService = inject(TaskService);
  private _translateService = inject(TranslateService);
  private _issueProviderService = inject(IssueProviderService, {
    optional: true,
  });
  private _jiraCommonInterfacesService = inject(JiraCommonInterfacesService, {
    optional: true,
  });
  private _openProjectApiService = inject(OpenProjectApiService, {
    optional: true,
  });
  private _snackService = inject(SnackService, {
    optional: true,
  });

  readonly IssueFieldType = IssueFieldType;

  task = input.required<TaskWithSubTasks>();
  issueData = input<IssueData>();

  isForceShowDescription = signal(false);
  isForceShowAllComments = signal(false);
  openProjectAttachments = signal<TaskAttachment[]>([]);
  isOpenProjectUploadingSignal = signal(false);

  config = computed<IssueContentConfig | undefined>(() => {
    const issueType = this.task().issueType as IssueProviderKey;
    if (!ISSUE_CONTENT_CONFIGS[issueType]) {
      throw new Error(`No issue content config found for issue type: ${issueType}`);
    }
    return ISSUE_CONTENT_CONFIGS[issueType];
  });

  issueUrl = computed(() => {
    const task = this.currentTask();
    const config = this.config();
    const issue = this.currentIssue();

    if (!config || !issue || !task) return '';

    // Handle JIRA URLs specially using the service
    if (
      config.issueType === 'JIRA' &&
      this._jiraCommonInterfacesService &&
      task.issueId &&
      task.issueProviderId
    ) {
      // Note: This returns an Observable, but we'll handle it in the template
      return 'jira-special-case';
    }

    // For other providers, use the config method
    return config.getIssueUrl ? config.getIssueUrl(issue) : '';
  });

  // TODO this is ugly as hell
  jiraIssueUrl$ = computed(() => {
    const task = this.currentTask();
    if (!task?.issueId || !task?.issueProviderId || !this._jiraCommonInterfacesService) {
      return of('');
    }
    return this._jiraCommonInterfacesService.issueLink$(
      task.issueId,
      task.issueProviderId,
    );
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

  jiraTimeSpent = computed(() => {
    const issue = this.currentIssue();
    if (!this._isJiraIssue(issue) || !issue.timespent) return 0;
    return (issue as JiraIssue).timespent * 1000;
  });

  jiraTimeEstimate = computed(() => {
    const issue = this.currentIssue();
    if (!this._isJiraIssue(issue) || !issue.timeestimate) return 0;
    return (issue as JiraIssue).timeestimate * 1000;
  });

  hasRedmineSpentHours = computed(() => {
    const issue = this.currentIssue();
    return !!issue && 'spent_hours' in issue && (issue as any).spent_hours !== undefined;
  });

  redmineSpentHours = computed(() => {
    const issue = this.currentIssue();
    if (!issue || !('spent_hours' in issue)) return 0;
    return (issue as any).spent_hours || 0;
  });

  hasRedmineTotalSpentHours = computed(() => {
    const issue = this.currentIssue();
    return (
      !!issue &&
      'total_spent_hours' in issue &&
      (issue as any).total_spent_hours !== undefined
    );
  });

  redmineTotalSpentHours = computed(() => {
    const issue = this.currentIssue();
    if (!issue || !('total_spent_hours' in issue)) return 0;
    return (issue as any).total_spent_hours || 0;
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

  // OpenProject attachment methods
  isOpenProjectUploading = computed(() => {
    return this.isOpenProjectUploadingSignal();
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

  openProjectAttachmentsComputed = computed(() => {
    const issue = this.currentIssue() as OpenProjectWorkPackage;
    const uploaded = this.openProjectAttachments();

    // Get attachments from the issue data
    const issueAttachments = issue?._embedded?.attachments?._embedded?.elements
      ? issue._embedded.attachments._embedded.elements.map((att) =>
          mapOpenProjectAttachmentToTaskAttachment(att),
        )
      : [];

    // Combine issue attachments with any newly uploaded ones
    return [...issueAttachments, ...uploaded];
  });

  // Keep the method for backward compatibility in template
  getOpenProjectAttachments(): TaskAttachment[] {
    return this.openProjectAttachmentsComputed();
  }

  async onOpenProjectFileUpload(event: Event): Promise<void> {
    if (
      !this._issueProviderService ||
      !this._openProjectApiService ||
      !this._snackService
    ) {
      return;
    }

    this.isOpenProjectUploadingSignal.set(true);

    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    const currentTask = this.currentTask();

    if (!file || !currentTask || !currentTask.issueId || !currentTask.issueProviderId) {
      if (!file) {
        this._snackService.open({
          type: 'ERROR',
          msg: 'No file selected',
        });
      }

      element.value = '';
      this.isOpenProjectUploadingSignal.set(false);
      return;
    }

    try {
      const cfg = await this._issueProviderService
        .getCfgOnce$(currentTask.issueProviderId, 'OPEN_PROJECT')
        .toPromise();

      const dateTime = moment().format('YYYYMMDD_HHmmss');
      const fileExtension = file?.name.split('.').pop();

      let fileName = `${dateTime}_${currentTask.issueId}.${fileExtension}`;

      const fileNamePrefix = cfg.metadata?.['attachments']?.['fileNamePrefix'];
      if (fileNamePrefix) {
        fileName = `${fileNamePrefix}_${fileName}`;
      }

      const newAttachment = await this._openProjectApiService
        .uploadAttachment$(cfg, currentTask.issueId, file, fileName)
        .toPromise();

      // Add the new attachment to the uploaded attachments signal
      const currentUploaded = this.openProjectAttachments();
      this.openProjectAttachments.set([
        ...currentUploaded,
        mapOpenProjectAttachmentToTaskAttachment(newAttachment),
      ]);

      element.value = '';
    } catch (error) {
      this._snackService.open({
        type: 'ERROR',
        msg: 'Failed to upload attachment',
      });
    } finally {
      this.isOpenProjectUploadingSignal.set(false);
    }
  }

  protected readonly T = T;
}
