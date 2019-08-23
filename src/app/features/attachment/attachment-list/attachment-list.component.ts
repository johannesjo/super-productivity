import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {Attachment} from '../attachment.model';
import {AttachmentService} from '../attachment.service';
import {MatDialog} from '@angular/material/dialog';
import {DialogEditAttachmentComponent} from '../dialog-edit-attachment/dialog-edit-attachment.component';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {T} from '../../../t.const';

@Component({
  selector: 'attachment-list',
  templateUrl: './attachment-list.component.html',
  styleUrls: ['./attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class AttachmentListComponent implements OnInit {
  @Input() attachments: Attachment[];
  @Input() isDisableControls = false;

  T = T;
  isError: boolean[] = [];

  constructor(
    public readonly attachmentService: AttachmentService,
    private readonly _matDialog: MatDialog,
  ) {
  }

  ngOnInit() {
  }

  openEditDialog(attachment?: Attachment) {
    this._matDialog.open(DialogEditAttachmentComponent, {
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

  trackByFn(i: number, attachment: Attachment) {
    return attachment
      ? attachment.id
      : i;
  }
}
