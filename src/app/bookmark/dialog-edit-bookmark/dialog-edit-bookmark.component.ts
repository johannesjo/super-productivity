import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { IS_ELECTRON } from '../../app.constants';
import { Task } from '../../tasks/task.model';
import { MATERIAL_ICONS } from './material-icons.const';

@Component({
  selector: 'dialog-edit-bookmark',
  templateUrl: './dialog-edit-bookmark.component.html',
  styleUrls: ['./dialog-edit-bookmark.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditBookmarkComponent implements OnInit {
  types: any[];
  bookmarkCopy: any;
  selectedTask: Task;
  customIcons: string [] = MATERIAL_ICONS;

  constructor(
    private _matDialogRef: MatDialogRef<DialogEditBookmarkComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  ngOnInit() {
    this.bookmarkCopy = {...this.data.bookmark};

    if (!this.bookmarkCopy.type) {
      this.bookmarkCopy.type = 'LINK';
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

  close(bookmark?) {
    this._matDialogRef.close(bookmark);
  }

  submit() {
    if (this.bookmarkCopy.type === 'LINK' && !this.bookmarkCopy.path.match(/(https?|ftp|file):\/\//)) {
      this.bookmarkCopy.path = 'http://' + this.bookmarkCopy.path;
    }
    this.close(this.bookmarkCopy);
  }
}
