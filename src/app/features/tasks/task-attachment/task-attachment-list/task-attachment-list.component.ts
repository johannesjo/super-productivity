import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TaskAttachment } from '../task-attachment.model';
import { TaskAttachmentService } from '../task-attachment.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditTaskAttachmentComponent } from '../dialog-edit-attachment/dialog-edit-task-attachment.component';
import { standardListAnimation } from '../../../../ui/animations/standard-list.ani';
import { T } from '../../../../t.const';
import { SnackService } from 'src/app/core/snack/snack.service';
import { TaskAttachmentLinkDirective } from '../task-attachment-link/task-attachment-link.directive';
import { MatIcon } from '@angular/material/icon';
import { EnlargeImgDirective } from '../../../../ui/enlarge-img/enlarge-img.directive';
import { MatAnchor, MatButton } from '@angular/material/button';

@Component({
  selector: 'task-attachment-list',
  templateUrl: './task-attachment-list.component.html',
  styleUrls: ['./task-attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
  imports: [
    TaskAttachmentLinkDirective,
    MatIcon,
    EnlargeImgDirective,
    MatAnchor,
    MatButton,
  ],
})
export class TaskAttachmentListComponent {
  readonly attachmentService = inject(TaskAttachmentService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _snackService = inject(SnackService);

  readonly taskId = input<string>();
  readonly attachments = input<TaskAttachment[]>();
  readonly isDisableControls = input<boolean>(false);

  T: typeof T = T;
  isError: boolean[] = [];

  openEditDialog(attachment?: TaskAttachment): void {
    if (!this.taskId()) {
      throw new Error('No task id given');
    }

    this._matDialog
      .open(DialogEditTaskAttachmentComponent, {
        restoreFocus: true,
        data: {
          attachment,
        },
      })
      .afterClosed()
      .subscribe((attachmentIN) => {
        const taskId = this.taskId();
        if (!taskId) {
          throw new Error('No taskId');
        }
        if (attachmentIN) {
          if (attachmentIN.id) {
            this.attachmentService.updateAttachment(
              taskId,
              attachmentIN.id,
              attachmentIN,
            );
          } else {
            this.attachmentService.addAttachment(taskId, attachmentIN);
          }
        }
      });
  }

  async copy(attachment?: TaskAttachment): Promise<void> {
    if (!attachment || !attachment.path) return;

    try {
      // Try modern clipboard API first (works in most browsers with user gesture)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(attachment.path);
        this._snackService.open(T.GLOBAL_SNACK.COPY_TO_CLIPPBOARD);
      } else {
        // Fallback for older browsers or when clipboard API is not available
        this._copyWithFallback(attachment.path);
      }
    } catch (error) {
      console.warn('Clipboard write failed, trying fallback method:', error);
      // Try fallback method if modern API fails
      this._copyWithFallback(attachment.path);
    }
  }

  private _copyWithFallback(text: string): void {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this._snackService.open(T.GLOBAL_SNACK.COPY_TO_CLIPPBOARD);
      } else {
        this._snackService.open({
          msg: 'Failed to copy to clipboard. Please copy manually.',
          type: 'ERROR',
        });
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this._snackService.open({
        msg: 'Failed to copy to clipboard. Please copy manually.',
        type: 'ERROR',
      });
    } finally {
      document.body.removeChild(textarea);
    }
  }

  remove(id: string): void {
    const taskId = this.taskId();
    if (!taskId) {
      throw new Error('No taskId');
    }
    this.attachmentService.deleteAttachment(taskId, id);
  }

  trackByFn(i: number, attachment: TaskAttachment): string | number | null {
    return attachment ? attachment.id : i;
  }
}
