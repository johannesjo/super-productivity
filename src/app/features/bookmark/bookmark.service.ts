import { Injectable, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  initialBookmarkState,
  selectAllBookmarks,
  selectIsShowBookmarkBar,
} from './store/bookmark.reducer';
import {
  addBookmark,
  deleteBookmark,
  hideBookmarks,
  loadBookmarkState,
  reorderBookmarks,
  showBookmarks,
  toggleBookmarks,
  updateBookmark,
} from './store/bookmark.actions';
import { Observable } from 'rxjs';
import { Bookmark, BookmarkState } from './bookmark.model';
import { nanoid } from 'nanoid';
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
  private _store$ = inject<Store<BookmarkState>>(Store);
  private _matDialog = inject(MatDialog);
  private _persistenceService = inject(PersistenceService);

  bookmarks$: Observable<Bookmark[]> = this._store$.pipe(select(selectAllBookmarks));
  isShowBookmarks$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowBookmarkBar),
  );

  async loadStateForProject(projectId: string): Promise<void> {
    const lsBookmarkState = await this._persistenceService.bookmark.load(projectId);
    this.loadState(lsBookmarkState || initialBookmarkState);
  }

  loadState(state: BookmarkState): void {
    this._store$.dispatch(loadBookmarkState({ state }));
  }

  addBookmark(bookmark: Bookmark): void {
    this._store$.dispatch(
      addBookmark({
        bookmark: {
          ...bookmark,
          id: nanoid(),
        },
      }),
    );
  }

  deleteBookmark(id: string): void {
    this._store$.dispatch(deleteBookmark({ id }));
  }

  updateBookmark(id: string, changes: Partial<Bookmark>): void {
    this._store$.dispatch(updateBookmark({ bookmark: { id, changes } }));
  }

  showBookmarks(): void {
    this._store$.dispatch(showBookmarks());
  }

  hideBookmarks(): void {
    this._store$.dispatch(hideBookmarks());
  }

  toggleBookmarks(): void {
    this._store$.dispatch(toggleBookmarks());
  }

  reorderBookmarks(ids: string[]): void {
    this._store$.dispatch(reorderBookmarks({ ids }));
  }

  // HANDLE INPUT
  // ------------
  createFromDrop(ev: DragEvent): void {
    this._handleInput(createFromDrop(ev) as DropPasteInput, ev);
  }

  createFromPaste(ev: ClipboardEvent): void {
    this._handleInput(createFromPaste(ev) as DropPasteInput, ev);
  }

  private _handleInput(bookmark: DropPasteInput, ev: Event): void {
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
