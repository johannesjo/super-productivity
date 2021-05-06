import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  BookmarkState,
  initialBookmarkState,
  selectAllBookmarks,
  selectIsShowBookmarkBar,
} from './store/bookmark.reducer';
import {
  AddBookmark,
  DeleteBookmark,
  HideBookmarks,
  LoadBookmarkState,
  ReorderBookmarks,
  ShowBookmarks,
  ToggleBookmarks,
  UpdateBookmark,
} from './store/bookmark.actions';
import { Observable } from 'rxjs';
import { Bookmark } from './bookmark.model';
import * as shortid from 'shortid';
import { DialogEditBookmarkComponent } from './dialog-edit-bookmark/dialog-edit-bookmark.component';
import { MatDialog } from '@angular/material/dialog';
import { PersistenceService } from '../../core/persistence/persistence.service';
import {
  createFromDrop,
  createFromPaste,
} from '../../core/drop-paste-input/drop-paste-input';
import { DropPasteInput } from '../../core/drop-paste-input/drop-paste.model';

@Injectable({
  providedIn: 'root',
})
export class BookmarkService {
  bookmarks$: Observable<Bookmark[]> = this._store$.pipe(select(selectAllBookmarks));
  isShowBookmarks$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowBookmarkBar),
  );

  constructor(
    private _store$: Store<BookmarkState>,
    private _matDialog: MatDialog,
    private _persistenceService: PersistenceService,
  ) {}

  async loadStateForProject(projectId: string) {
    const lsBookmarkState = await this._persistenceService.bookmark.load(projectId);
    this.loadState(lsBookmarkState || initialBookmarkState);
  }

  loadState(state: BookmarkState) {
    this._store$.dispatch(new LoadBookmarkState({ state }));
  }

  addBookmark(bookmark: Bookmark) {
    this._store$.dispatch(
      new AddBookmark({
        bookmark: {
          ...bookmark,
          id: shortid(),
        },
      }),
    );
  }

  deleteBookmark(id: string) {
    this._store$.dispatch(new DeleteBookmark({ id }));
  }

  updateBookmark(id: string, changes: Partial<Bookmark>) {
    this._store$.dispatch(new UpdateBookmark({ bookmark: { id, changes } }));
  }

  showBookmarks() {
    this._store$.dispatch(new ShowBookmarks());
  }

  hideBookmarks() {
    this._store$.dispatch(new HideBookmarks());
  }

  toggleBookmarks() {
    this._store$.dispatch(new ToggleBookmarks());
  }

  reorderBookmarks(ids: string[]) {
    this._store$.dispatch(new ReorderBookmarks({ ids }));
  }

  // HANDLE INPUT
  // ------------
  createFromDrop(ev: DragEvent) {
    this._handleInput(createFromDrop(ev) as DropPasteInput, ev);
  }

  createFromPaste(ev: ClipboardEvent) {
    this._handleInput(createFromPaste(ev) as DropPasteInput, ev);
  }

  private _handleInput(bookmark: DropPasteInput, ev: Event) {
    // properly not intentional so we leave
    if (!bookmark || !bookmark.path) {
      return;
    }

    // don't intervene with text inputs
    const targetEl: HTMLElement = ev.target as HTMLElement;
    if (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA') {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    this._matDialog
      .open(DialogEditBookmarkComponent, {
        restoreFocus: true,
        data: {
          bookmark: { ...bookmark },
        },
      })
      .afterClosed()
      .subscribe((bookmarkIN) => {
        if (bookmarkIN) {
          if (bookmarkIN.id) {
            this.updateBookmark(bookmarkIN.id, bookmarkIN);
          } else {
            this.addBookmark(bookmarkIN);
          }
        }
      });
  }
}
