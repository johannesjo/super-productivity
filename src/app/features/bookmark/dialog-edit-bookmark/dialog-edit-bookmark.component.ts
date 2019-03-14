import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { IS_ELECTRON } from '../../../app.constants';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { BookmarkCopy, BookmarkType } from '../bookmark.model';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

interface BookmarkSelectType {
  type: BookmarkType;
  title: string;
}

@Component({
  selector: 'dialog-edit-bookmark',
  templateUrl: './dialog-edit-bookmark.component.html',
  styleUrls: ['./dialog-edit-bookmark.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditBookmarkComponent implements OnInit {
  types: BookmarkSelectType[];
  bookmarkCopy: BookmarkCopy;
  customIcons: string[] = MATERIAL_ICONS;
  iconControl = new FormControl();
  filteredIcons$: Observable<string[]> = this.iconControl.valueChanges.pipe(
    startWith(''),
    map((searchTerm) => {
      // Note: the outer array signifies the observable stream the other is the value
      return this.customIcons.filter((icoStr) =>
        icoStr.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }),
  );

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

  mapTypeToLabel(type: BookmarkType) {
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
