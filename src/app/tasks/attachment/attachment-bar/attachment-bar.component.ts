import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { AttachmentService } from '../attachment.service';
import { MatDialog } from '@angular/material';
import { Attachment } from '../attachment.model';
import { fadeAnimation } from '../../../ui/animations/fade.ani';

@Component({
  selector: 'attachment-bar',
  templateUrl: './attachment-bar.component.html',
  styleUrls: ['./attachment-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
})
export class AttachmentBarComponent {
  isDragOver = false;
  dragEnterTarget: HTMLElement;

  constructor(
    public readonly attachmentService: AttachmentService,
    private readonly _matDialog: MatDialog,
  ) {
  }

  @HostListener('dragenter', ['$event']) onDragEnter(ev: Event) {
    this.dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: Event) {
    if (this.dragEnterTarget === (event.target as HTMLElement)) {
      event.preventDefault();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: Event) {
    // this.attachmentService.createFromDrop(ev);
    // this.isDragOver = false;
  }

  openEditDialog(attachment?: Attachment) {
    // this._matDialog.open(DialogEditAttachmentComponent, {
    //   data: {
    //     attachment: attachment
    //   },
    // }).afterClosed()
    //   .subscribe((attachment_) => {
    //     if (attachment_) {
    //       if (attachment_.id) {
    //         this.attachmentService.updateAttachment(attachment_.id, attachment_);
    //       } else {
    //         this.attachmentService.addAttachment(attachment_);
    //       }
    //     }
    //   });
  }

  remove(id) {
    // this.attachmentService.deleteAttachment(id);
  }
}
