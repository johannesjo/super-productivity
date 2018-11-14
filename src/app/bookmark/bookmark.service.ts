import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { BookmarkState, initialBookmarkState, selectAllBookmarks, selectIsShowBookmarkBar } from './store/bookmark.reducer';
import {
  AddBookmark,
  DeleteBookmark,
  HideBookmarks,
  LoadBookmarkState,
  ShowBookmarks,
  ToggleBookmarks,
  UpdateBookmark
} from './store/bookmark.actions';
import { Observable } from 'rxjs';
import { Bookmark } from './bookmark.model';
import shortid from 'shortid';
import { DialogEditBookmarkComponent } from './dialog-edit-bookmark/dialog-edit-bookmark.component';
import { MatDialog } from '@angular/material';
import { PersistenceService } from '../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  bookmarks$: Observable<Bookmark[]> = this._store$.pipe(select(selectAllBookmarks));
  isShowBookmarks$: Observable<boolean> = this._store$.pipe(select(selectIsShowBookmarkBar));

  constructor(
    private _store$: Store<BookmarkState>,
    private _matDialog: MatDialog,
    private _persistenceService: PersistenceService,
  ) {
  }

  loadStateForProject(projectId: string) {
    const lsBookmarkState = this._persistenceService.loadBookmarksForProject(projectId);
    this.loadState(lsBookmarkState || initialBookmarkState);
  }

  loadState(state: BookmarkState) {
    this._store$.dispatch(new LoadBookmarkState({state}));
  }

  addBookmark(bookmark: Bookmark) {
    this._store$.dispatch(new AddBookmark({
      bookmark: {
        ...bookmark,
        id: shortid()
      }
    }));
  }

  deleteBookmark(id: string) {
    this._store$.dispatch(new DeleteBookmark({id}));
  }

  updateBookmark(id: string, changes: Partial<Bookmark>) {
    this._store$.dispatch(new UpdateBookmark({bookmark: {id, changes}}));
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

  // loadBookmarks() {
  //   this._store$.dispatch(new LoadBookmarks());
  // }
  //
  // upsertBookmark() {
  //   this._store$.dispatch(new UpsertBookmark());
  // }
  //
  // addBookmarks() {
  //   this._store$.dispatch(new AddBookmarks());
  // }
  //
  // upsertBookmarks() {
  //   this._store$.dispatch(new UpsertBookmarks());
  // }
  //
  //
  // updateBookmarks() {
  //   this._store$.dispatch(new UpdateBookmarks());
  // }
  //
  //
  // deleteBookmarks() {
  //   this._store$.dispatch(new DeleteBookmarks());
  // }
  //
  // clearBookmarks() {
  //   this._store$.dispatch(new ClearBookmarks());
  // }

  // HANDLE LINK INPUT METHODS
  // -------------------------

  createFromDrop(ev) {
    const text = ev.dataTransfer.getData('text');
    const bookmark =
      text
        ? (this._createTextBookmark(text))
        : (this._createFileBookmark(ev.dataTransfer));
    this._handleLinkInput(bookmark, ev);
  }


  createFromPaste(ev) {
    if (ev.target.getAttribute('contenteditable')) {
      return;
    }
    const text = ev.clipboardData.getData('text/plain');
    if (text) {
      const bookmark = this._createTextBookmark(text);
      this._handleLinkInput(bookmark, ev);
    }
  }


  private _handleLinkInput(bookmark, ev) {
    // don't intervene with text inputs
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') {
      return;
    }

    // properly not intentional so we leave
    if (!bookmark || !bookmark.path) {
      return;
    }

    this._matDialog.open(DialogEditBookmarkComponent, {
      data: {
        bookmark: bookmark
      },
    }).afterClosed()
      .subscribe((bookmark_) => {
        if (bookmark_) {
          if (bookmark_.id) {
            this.updateBookmark(bookmark_.id, bookmark_);
          } else {
            this.addBookmark(bookmark_);
          }
        }
      });

    // TODO HANDLE TARGET BY USING THE HANDLERS IN THEIR RESPECTIVE ELEMENTS
    ev.preventDefault();
    ev.stopPropagation();
  }

  private _createTextBookmark(text) {
    if (text) {
      if (text.match(/\n/)) {
        // this.addItem({
        //  title: text.substr(0, MAX_TITLE_LENGTH),
        //  type: 'TEXT'
        // });
      } else {
        let path = text;
        if (!path.match(/^http/)) {
          path = '//' + path;
        }
        return {
          title: this._baseName(text),
          path: path,
          type: 'LINK'
        };
      }
    }
  }

  private _createFileBookmark(dataTransfer) {
    const path = dataTransfer.files[0] && dataTransfer.files[0].path;
    if (path) {
      return {
        title: this._baseName(path),
        path: path,
        type: 'FILE'
      };
    }
  }

  private _baseName(passedStr) {
    const str = passedStr.trim();
    let base;
    if (str[str.length - 1] === '/') {
      const strippedStr = str.substring(0, str.length - 2);
      base = strippedStr.substring(strippedStr.lastIndexOf('/') + 1);
    } else {
      base = str.substring(str.lastIndexOf('/') + 1);
    }

    if (base.lastIndexOf('.') !== -1) {
      base = base.substring(0, base.lastIndexOf('.'));
    }
    return base;
  }
}
