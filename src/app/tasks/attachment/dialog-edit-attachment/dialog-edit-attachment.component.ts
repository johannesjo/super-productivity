import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { IS_ELECTRON } from '../../../app.constants';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { AttachmentCopy, AttachmentType } from '../attachment.model';
import { FormControl } from '@angular/forms';

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
  customIcons: string[] = MATERIAL_ICONS;
  iconControl = new FormControl();

  constructor(
    private _matDialogRef: MatDialogRef<DialogEditAttachmentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  ngOnInit() {
    this.attachmentCopy = {...this.data.attachment};
    console.log(this.attachmentCopy);

    if (!this.attachmentCopy.type) {
      this.attachmentCopy.type = 'LINK';
    }
    this.types = [
      {type: 'LINK', title: 'Link (opens in browser)'},
      {type: 'IMG', title: 'Image (shown as thumbnail)'},
    ];
    if (IS_ELECTRON) {
      this.types.push({type: 'FILE', title: 'File (opened by default system app)'});
      this.types.push({type: 'COMMAND', title: 'Command (custom shell command)'});
    }
  }

  close(attachment?) {
    this._matDialogRef.close(attachment);
  }

  submit() {
    if (this.attachmentCopy.type === 'LINK' && !this.attachmentCopy.path.match(/(https?|ftp|file):\/\//)) {
      this.attachmentCopy.path = 'http://' + this.attachmentCopy.path;
    }
    this.close(this.attachmentCopy);
  }

  mapTypeToLabel(type: AttachmentType) {
    switch (type) {
      case 'FILE':
        return 'File Path';
      case 'IMG':
        return 'Image';
      case 'COMMAND':
        return 'Command';
      case 'LINK':
      default:
        return 'Url';
    }
  }
}
