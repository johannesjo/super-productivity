import {
  ChangeDetectionStrategy,
  Component,
  Input,
  input,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { OpenProjectWorkPackage } from '../open-project-issue.model';
import { expandAnimation } from '../../../../../ui/animations/expand.ani';
import { T } from '../../../../../t.const';
import { TaskService } from '../../../../tasks/task.service';
import { MatButton } from '@angular/material/button';
import { MarkdownComponent } from 'ngx-markdown';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { TaskAttachment } from '../../../../tasks/task-attachment/task-attachment.model';
import { IssueProviderService } from '../../../issue-provider.service';
import { mapOpenProjectAttachmentToTaskAttachment } from '../open-project-issue-map.util';
import { MatProgressBar } from '@angular/material/progress-bar';
import { OpenProjectApiService } from '../open-project-api.service';
import { SnackService } from '../../../../../core/snack/snack.service';
import { formatDateTimeForFilename } from '../../../../../util/format-date-time-for-filename';

@Component({
  selector: 'open-project-issue-content',
  templateUrl: './open-project-issue-content.component.html',
  styleUrls: ['./open-project-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  imports: [MatButton, MarkdownComponent, TranslatePipe, MatIcon, MatProgressBar],
})
export class OpenProjectIssueContentComponent {
  private readonly _taskService = inject(TaskService);
  private readonly _issueProviderService = inject(IssueProviderService);
  private readonly _openProjectApiService = inject(OpenProjectApiService);
  private readonly _snackService = inject(SnackService);
  private readonly _cdr = inject(ChangeDetectorRef);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() issue?: OpenProjectWorkPackage;
  readonly task = input<TaskWithSubTasks>();

  attachments: TaskAttachment[] | undefined;
  isUploading: boolean = false;

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

  getTaskAttachments(issue: OpenProjectWorkPackage): TaskAttachment[] {
    if (this.attachments) {
      return this.attachments;
    }

    this.attachments = issue?._embedded?.attachments._embedded.elements.map((att) =>
      mapOpenProjectAttachmentToTaskAttachment(att),
    );

    return this.attachments;
  }

  async onFileUpload(event: Event): Promise<void> {
    this.isUploading = true;

    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    const currentTask = this.task();

    if (!file || !currentTask || !currentTask.issueId || !currentTask.issueProviderId) {
      if (!file) {
        this._snackService.open({ type: 'ERROR', msg: T.F.OPEN_PROJECT.S.ERR_NO_FILE });
      }

      element.value = '';

      return;
    }

    const cfg = await this._issueProviderService
      .getCfgOnce$(currentTask.issueProviderId, 'OPEN_PROJECT')
      .toPromise();

    const dateTime = formatDateTimeForFilename();
    const fileExtension = file?.name.split('.').pop();

    let fileName = `${dateTime}_${currentTask.issueId}.${fileExtension}`;

    const fileNamePrefix = cfg.metadata?.['attachments']?.['fileNamePrefix'];
    if (fileNamePrefix) {
      fileName = `${fileNamePrefix}_${fileName}`;
    }

    const newAttachment = await this._openProjectApiService
      .uploadAttachment$(cfg, currentTask.issueId, file, fileName)
      .toPromise();

    element.value = '';
    this.isUploading = false;
    this.attachments?.push(mapOpenProjectAttachmentToTaskAttachment(newAttachment));

    this._cdr.markForCheck();
  }
}
