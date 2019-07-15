import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {IS_ELECTRON} from '../../../app.constants';
import {AttachmentCopy, AttachmentType} from '../attachment.model';
import {T} from '../../../t.const';
import {TranslateService} from '@ngx-translate/core';

interface AttachmentSelectType {
  type: AttachmentType;
  title: string;
}

@Component({
  selector: 'dialog-edit-attachment',
  templateUrl: './dialog-edit-attachment.component.html',
  styleUrls: ['./dialog-edit-attachment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditAttachmentComponent implements OnInit {
  types: AttachmentSelectType[];
  attachmentCopy: AttachmentCopy;
  T = T;

  constructor(
    private _matDialogRef: MatDialogRef<DialogEditAttachmentComponent>,
    private _translateService: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  ngOnInit() {
    this.attachmentCopy = {...this.data.attachment};

    if (!this.attachmentCopy.type) {
      this.attachmentCopy.type = 'LINK';
    }
    this.types = [
      {type: 'LINK', title: T.F.ATTACHMENT.DIALOG_EDIT.TYPES.LINK},
      {type: 'IMG', title: T.F.ATTACHMENT.DIALOG_EDIT.TYPES.IMG},
    ];
    if (IS_ELECTRON) {
      this.types.push({type: 'FILE', title: T.F.ATTACHMENT.DIALOG_EDIT.TYPES.FILE});
    }
  }

  close(attachment?) {
    this._matDialogRef.close(attachment);
  }

  submit() {
    // don't submit invalid data
    if (!this.attachmentCopy.path || !this.attachmentCopy.type) {
      return;
    }

    if (this.attachmentCopy.type === 'LINK' && this.attachmentCopy.path && !this.attachmentCopy.path.match(/(https?|ftp|file):\/\//)) {
      this.attachmentCopy.path = 'http://' + this.attachmentCopy.path;
    }

    this.close(this.attachmentCopy);
  }

  mapTypeToLabel(type: AttachmentType): string {
    switch (type) {
      case 'FILE':
        return T.F.ATTACHMENT.DIALOG_EDIT.LABELS.LINK;
      case 'IMG':
        return T.F.ATTACHMENT.DIALOG_EDIT.LABELS.IMG;
      case 'LINK':
      default:
        return T.F.ATTACHMENT.DIALOG_EDIT.LABELS.LINK;
    }
  }
}
