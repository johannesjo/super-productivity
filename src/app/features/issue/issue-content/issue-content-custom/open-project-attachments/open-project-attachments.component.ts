import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  computed,
} from '@angular/core';
import { IssueData } from '../../../issue.model';
import { IssueContentConfig } from '../../issue-content.model';
import { IssueProviderService } from '../../../issue-provider.service';
import { OpenProjectApiService } from '../../../providers/open-project/open-project-api.service';
import { TaskAttachment } from '../../../../tasks/task-attachment/task-attachment.model';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../../../tasks/task.service';
import { formatDateTimeForFilename } from '../../../../../util/format-date-time-for-filename';
import { SnackService } from '../../../../../core/snack/snack.service';
import { OpenProjectWorkPackage } from '../../../providers/open-project/open-project-issue.model';
import { mapOpenProjectAttachmentToTaskAttachment } from '../../../providers/open-project/open-project-issue-map.util';

@Component({
  selector: 'open-project-attachments',
  templateUrl: './open-project-attachments.component.html',
  styleUrls: ['./open-project-attachments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressBarModule, MatButtonModule, MatIconModule, TranslateModule],
})
export class OpenProjectAttachmentsComponent {
  private _taskService = inject(TaskService);
  private _issueProviderService = inject(IssueProviderService, {
    optional: true,
  });
  private _openProjectApiService = inject(OpenProjectApiService, {
    optional: true,
  });
  private _snackService = inject(SnackService, {
    optional: true,
  });

  readonly issue = input.required<IssueData>();
  readonly config = input.required<IssueContentConfig>();
  readonly task = input.required<any>();

  protected uploadedAttachments = signal<TaskAttachment[]>([]);
  protected isUploading = signal(false);

  protected allAttachments = computed(() => {
    const issue = this.issue() as OpenProjectWorkPackage;
    const uploaded = this.uploadedAttachments();

    // Get attachments from the issue data
    const issueAttachments = issue?._embedded?.attachments?._embedded?.elements
      ? issue._embedded.attachments._embedded.elements.map((att) =>
          mapOpenProjectAttachmentToTaskAttachment(att),
        )
      : [];

    // Combine issue attachments with any newly uploaded ones
    return [...issueAttachments, ...uploaded];
  });

  protected currentTask = computed(() => {
    return this.task();
  });

  async onFileUpload(event: Event): Promise<void> {
    if (
      !this._issueProviderService ||
      !this._openProjectApiService ||
      !this._snackService
    ) {
      return;
    }

    this.isUploading.set(true);

    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    const currentTask = this.currentTask();

    if (!file || !currentTask || !currentTask.issueId || !currentTask.issueProviderId) {
      if (!file && this._snackService && typeof this._snackService.open === 'function') {
        this._snackService.open({
          type: 'ERROR',
          msg: 'No file selected',
        });
      }

      element.value = '';
      this.isUploading.set(false);
      return;
    }

    try {
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

      // Add the new attachment to the uploaded attachments signal
      const currentUploaded = this.uploadedAttachments();
      this.uploadedAttachments.set([
        ...currentUploaded,
        mapOpenProjectAttachmentToTaskAttachment(newAttachment),
      ]);

      element.value = '';
    } catch (error) {
      if (this._snackService && typeof this._snackService.open === 'function') {
        this._snackService.open({
          type: 'ERROR',
          msg: 'Failed to upload attachment',
        });
      }
    } finally {
      this.isUploading.set(false);
    }
  }
}
