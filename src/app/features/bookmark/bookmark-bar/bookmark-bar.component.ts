import {ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild} from '@angular/core';
import {BookmarkService} from '../bookmark.service';
import {MatDialog} from '@angular/material/dialog';
import {DialogEditBookmarkComponent} from '../dialog-edit-bookmark/dialog-edit-bookmark.component';
import {Bookmark} from '../bookmark.model';
import {fadeAnimation} from '../../../ui/animations/fade.ani';
import {DragulaService} from 'ng2-dragula';
import {Subscription} from 'rxjs';
import {slideAnimation} from '../../../ui/animations/slide.ani';
import {T} from '../../../t.const';

@Component({
  selector: 'bookmark-bar',
  templateUrl: './bookmark-bar.component.html',
  styleUrls: ['./bookmark-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeAnimation,
    slideAnimation,
  ],
})
export class BookmarkBarComponent implements OnDestroy {
  isDragOver = false;
  isEditMode = false;
  dragEnterTarget: HTMLElement;
  LIST_ID = 'BOOKMARKS';
  T = T;

  bookmarkBarHeight = 50;

  @ViewChild('bookmarkBar', {read: ElementRef, static: false}) set bookmarkBarEl(content: ElementRef) {
    if (content && content.nativeElement) {
      this.bookmarkBarHeight = content.nativeElement.offsetHeight;
    }
  }

  private _subs = new Subscription();

  constructor(
    public readonly bookmarkService: BookmarkService,
    private readonly _matDialog: MatDialog,
    private _dragulaService: DragulaService,
  ) {
    // NOTE: not working because we have an svg
    // this._dragulaService.createGroup(this.LIST_ID, {
    // moves: function (el, container, handle) {
    //   return handle.className.indexOf && handle.className.indexOf('drag-handle') > -1;
    // }
    // });

    this._subs.add(this._dragulaService.dropModel(this.LIST_ID)
      .subscribe((params: any) => {
        const {target, source, targetModel, item} = params;
        const newIds = targetModel.map(m => m.id);
        this.bookmarkService.reorderBookmarks(newIds);
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  @HostListener('dragenter', ['$event']) onDragEnter(ev: Event) {
    this.dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: Event) {
    if (this.dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: Event) {
    this.bookmarkService.createFromDrop(ev);
    this.isDragOver = false;
  }

  openEditDialog(bookmark?: Bookmark) {
    this._matDialog.open(DialogEditBookmarkComponent, {
      restoreFocus: true,
      data: {
        bookmark: bookmark
      },
    }).afterClosed()
      .subscribe((bookmark_) => {
        if (bookmark_) {
          if (bookmark_.id) {
            this.bookmarkService.updateBookmark(bookmark_.id, bookmark_);
          } else {
            this.bookmarkService.addBookmark(bookmark_);
          }
        }
      });
  }

  remove(id) {
    this.bookmarkService.deleteBookmark(id);
  }

  trackByFn(i: number, bookmark: Bookmark) {
    return bookmark.id;
  }
}
