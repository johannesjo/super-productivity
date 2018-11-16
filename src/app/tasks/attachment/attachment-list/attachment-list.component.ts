import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Attachment } from '../attachment.model';
import { AttachmentService } from '../attachment.service';
import { MatDialog } from '@angular/material';
import { DialogEditAttachmentComponent } from '../dialog-edit-attachment/dialog-edit-attachment.component';

@Component({
  selector: 'attachment-list',
  templateUrl: './attachment-list.component.html',
  styleUrls: ['./attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttachmentListComponent implements OnInit {
  @Input() attachments: Attachment[];

  constructor(
    public readonly attachmentService: AttachmentService,
    private readonly _matDialog: MatDialog,
  ) {
  }

  ngOnInit() {
  }

  openEditDialog(attachment?: Attachment) {
    this._matDialog.open(DialogEditAttachmentComponent, {
      data: {
        attachment: attachment
      },
    }).afterClosed()
      .subscribe((attachment_) => {
        if (attachment_) {
          if (attachment_.id) {
            this.attachmentService.updateAttachment(attachment_.id, attachment_);
          } else {
            this.attachmentService.addAttachment(attachment_);
          }
        }
      });
  }

  remove(id) {
    this.attachmentService.deleteAttachment(id);
  }
}
