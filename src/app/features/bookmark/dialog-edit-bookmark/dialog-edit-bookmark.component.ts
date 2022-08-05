import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IS_ELECTRON } from '../../../app.constants';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { Bookmark, BookmarkCopy, BookmarkType } from '../bookmark.model';
import { UntypedFormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { T } from '../../../t.const';

interface BookmarkSelectType {
  type: BookmarkType;
  title: string;
}

@Component({
  selector: 'dialog-edit-bookmark',
  templateUrl: './dialog-edit-bookmark.component.html',
  styleUrls: ['./dialog-edit-bookmark.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogEditBookmarkComponent implements OnInit {
  T: typeof T = T;
  types?: BookmarkSelectType[];
  bookmarkCopy?: BookmarkCopy;
  customIcons: string[] = MATERIAL_ICONS;
  iconControl: UntypedFormControl = new UntypedFormControl();
  filteredIcons$: Observable<string[]> = this.iconControl.valueChanges.pipe(
    startWith(''),
    map((searchTerm) => {
      // Note: the outer array signifies the observable stream the other is the value
      return this.customIcons.filter((icoStr) =>
        icoStr.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }),
  );

  constructor(
    private _matDialogRef: MatDialogRef<DialogEditBookmarkComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { bookmark: Bookmark },
  ) {}

  ngOnInit(): void {
    this.bookmarkCopy = { ...this.data.bookmark } as BookmarkCopy;
    if (!this.bookmarkCopy.type) {
      this.bookmarkCopy.type = 'LINK';
    }
    this.types = [
      { type: 'LINK', title: T.F.BOOKMARK.DIALOG_EDIT.TYPES.LINK },
      { type: 'IMG', title: T.F.BOOKMARK.DIALOG_EDIT.TYPES.IMG },
    ];
    if (IS_ELECTRON) {
      this.types.push({ type: 'FILE', title: T.F.BOOKMARK.DIALOG_EDIT.TYPES.FILE });
      this.types.push({ type: 'COMMAND', title: T.F.BOOKMARK.DIALOG_EDIT.TYPES.COMMAND });
    }
  }

  close(bookmark?: Bookmark): void {
    this._matDialogRef.close(bookmark);
  }

  submit(): void {
    if (!this.bookmarkCopy) {
      throw new Error();
    }
    if (!this.bookmarkCopy.path) {
      return;
    }

    if (
      this.bookmarkCopy.type === 'LINK' &&
      !this.bookmarkCopy.path.match(/(https?|ftp|file):\/\//)
    ) {
      this.bookmarkCopy.path = 'http://' + this.bookmarkCopy.path;
    }
    this.close(this.bookmarkCopy);
  }

  mapTypeToLabel(type: BookmarkType): string {
    switch (type) {
      case 'FILE':
        return T.F.BOOKMARK.DIALOG_EDIT.LABELS.LINK;
      case 'IMG':
        return T.F.BOOKMARK.DIALOG_EDIT.LABELS.IMG;
      case 'COMMAND':
        return T.F.BOOKMARK.DIALOG_EDIT.LABELS.COMMAND;
      case 'LINK':
      default:
        return T.F.BOOKMARK.DIALOG_EDIT.LABELS.LINK;
    }
  }

  trackByIndex(i: number, p: unknown): number {
    return i;
  }
}
