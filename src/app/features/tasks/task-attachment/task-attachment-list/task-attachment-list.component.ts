import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskAttachment } from '../task-attachment.model';
import { TaskAttachmentService } from '../task-attachment.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditTaskAttachmentComponent } from '../dialog-edit-attachment/dialog-edit-task-attachment.component';
import { standardListAnimation } from '../../../../ui/animations/standard-list.ani';
import { T } from '../../../../t.const';
import { SnackService } from 'src/app/core/snack/snack.service';

@Component({
  selector: 'task-attachment-list',
  templateUrl: './task-attachment-list.component.html',
  styleUrls: ['./task-attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class TaskAttachmentListComponent {
  @Input() taskId?: string;
  @Input() attachments?: TaskAttachment[];
  @Input() isDisableControls: boolean = false;

  T: typeof T = T;
  isError: boolean[] = [];

  constructor(
    public readonly attachmentService: TaskAttachmentService,
    private readonly _matDialog: MatDialog,
    private readonly _snackService: SnackService,
  ) {}

  openEditDialog(attachment?: TaskAttachment): void {
    if (!this.taskId) {
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
        if (!this.taskId) {
          throw new Error('No taskId');
        }
        if (attachmentIN) {
          if (attachmentIN.id) {
            this.attachmentService.updateAttachment(
              this.taskId,
              attachmentIN.id,
              attachmentIN,
            );
          } else {
            this.attachmentService.addAttachment(this.taskId, attachmentIN);
          }
        }
      });
  }

  async copy(attachment?: TaskAttachment): Promise<void> {
    if (!attachment) return;
    // Force-cast PermissionDescriptor as 'clipboard-write' is not defined in type
    const permission = { name: 'clipboard-write' } as unknown as PermissionDescriptor;
    const result = await navigator.permissions.query(permission);
    if (result.state == 'granted' || result.state == 'prompt') {
      await navigator.clipboard.writeText(attachment.path);
      this._snackService.open(T.GLOBAL_SNACK.COPY_TO_CLIPPBOARD);
    }
  }

  remove(id: string): void {
    if (!this.taskId) {
      throw new Error('No taskId');
    }
    this.attachmentService.deleteAttachment(this.taskId, id);
  }

  trackByFn(i: number, attachment: TaskAttachment): string | number | null {
    return attachment ? attachment.id : i;
  }
}
