import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { IS_ELECTRON } from '../../../app.constants';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { Bookmark, BookmarkCopy, BookmarkType } from '../bookmark.model';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { T } from '../../../t.const';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

interface BookmarkSelectType {
  type: BookmarkType;
  title: string;
}

@Component({
  selector: 'dialog-edit-bookmark',
  templateUrl: './dialog-edit-bookmark.component.html',
  styleUrls: ['./dialog-edit-bookmark.component.scss'],
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
    MatAutocompleteTrigger,
    ReactiveFormsModule,
    MatIcon,
    MatPrefix,
    MatAutocomplete,
    MatDialogActions,
    MatButton,
    AsyncPipe,
    TranslatePipe,
  ],
})
export class DialogEditBookmarkComponent implements OnInit {
  private _matDialogRef = inject<MatDialogRef<DialogEditBookmarkComponent>>(MatDialogRef);
  data = inject<{
    bookmark: Bookmark;
  }>(MAT_DIALOG_DATA);

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
