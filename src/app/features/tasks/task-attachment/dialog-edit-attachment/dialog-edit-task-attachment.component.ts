import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { IS_ELECTRON } from '../../../../app.constants';
import {
  TaskAttachment,
  TaskAttachmentCopy,
  TaskAttachmentType,
} from '../task-attachment.model';
import { T } from '../../../../t.const';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

interface TaskAttachmentSelectType {
  type: TaskAttachmentType;
  title: string;
}

@Component({
  selector: 'dialog-edit-task-attachment',
  templateUrl: './dialog-edit-task-attachment.component.html',
  styleUrls: ['./dialog-edit-task-attachment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MatDialogActions,
    MatButton,
    MatIcon,
    TranslatePipe,
  ],
})
export class DialogEditTaskAttachmentComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogEditTaskAttachmentComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  types: TaskAttachmentSelectType[];
  attachmentCopy: TaskAttachmentCopy;
  T: typeof T = T;

  constructor() {
    this.attachmentCopy = { ...this.data.attachment } as TaskAttachmentCopy;
    if (!this.attachmentCopy.type) {
      this.attachmentCopy.type = 'LINK';
    }

    this.types = [
      { type: 'LINK', title: T.F.ATTACHMENT.DIALOG_EDIT.TYPES.LINK },
      { type: 'IMG', title: T.F.ATTACHMENT.DIALOG_EDIT.TYPES.IMG },
    ];
    if (IS_ELECTRON) {
      this.types.push({ type: 'FILE', title: T.F.ATTACHMENT.DIALOG_EDIT.TYPES.FILE });
    }
  }

  close(attachment?: TaskAttachment): void {
    this._matDialogRef.close(attachment);
  }

  submit(): void {
    // don't submit invalid data
    if (!this.attachmentCopy.path || !this.attachmentCopy.type) {
      return;
    }

    if (
      this.attachmentCopy.type === 'LINK' &&
      this.attachmentCopy.path &&
      // don't prepend for all valid RFC3986 URIs
      !this.attachmentCopy.path.match(
        /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/,
      )
    ) {
      this.attachmentCopy.path = 'http://' + this.attachmentCopy.path;
    }

    this.close(this.attachmentCopy);
  }

  mapTypeToLabel(type: TaskAttachmentType): string {
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

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
