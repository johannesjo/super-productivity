import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {TaskAttachment} from '../task-attachment.model';
import {TaskAttachmentService} from '../task-attachment.service';
import {MatDialog} from '@angular/material/dialog';
import {DialogEditTaskAttachmentComponent} from '../dialog-edit-attachment/dialog-edit-task-attachment.component';
import {standardListAnimation} from '../../../../ui/animations/standard-list.ani';
import {T} from '../../../../t.const';

@Component({
  selector: 'task-attachment-list',
  templateUrl: './task-attachment-list.component.html',
  styleUrls: ['./task-attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class TaskAttachmentListComponent implements OnInit {
  @Input() attachments: TaskAttachment[];
  @Input() isDisableControls = false;

  T = T;
  isError: boolean[] = [];

  constructor(
    public readonly attachmentService: TaskAttachmentService,
    private readonly _matDialog: MatDialog,
  ) {
  }

  ngOnInit() {
  }

  openEditDialog(attachment?: TaskAttachment) {
    this._matDialog.open(DialogEditTaskAttachmentComponent, {
      restoreFocus: true,
      data: {
        attachment
      },
    }).afterClosed()
      .subscribe((attachmentIN) => {
        if (attachmentIN) {
          if (attachmentIN.id) {
            this.attachmentService.updateAttachment(attachmentIN.id, attachmentIN);
          } else {
            this.attachmentService.addAttachment(attachmentIN);
          }
        }
      });
  }

  remove(id) {
    this.attachmentService.deleteAttachment(id);
  }

  trackByFn(i: number, attachment: TaskAttachment) {
    return attachment
      ? attachment.id
      : i;
  }
}
