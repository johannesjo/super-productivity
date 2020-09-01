import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { BookmarkService } from '../bookmark.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditBookmarkComponent } from '../dialog-edit-bookmark/dialog-edit-bookmark.component';
import { Bookmark } from '../bookmark.model';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';
import { slideAnimation } from '../../../ui/animations/slide.ani';
import { T } from '../../../t.const';

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
  isDragOver: boolean = false;
  isEditMode: boolean = false;
  dragEnterTarget?: HTMLElement;
  LIST_ID: string = 'BOOKMARKS';
  T: typeof T = T;
  isContextMenuDisabled: boolean = false;
  bookmarkBarHeight: number = 50;
  private _subs: Subscription = new Subscription();

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
      .subscribe(({targetModel}: any) => {
        // const {target, source, targetModel, item} = params;
        const newIds = targetModel.map((m: Bookmark) => m.id);
        this.bookmarkService.reorderBookmarks(newIds);
      })
    );
  }

  @ViewChild('bookmarkBar', {read: ElementRef}) set bookmarkBarEl(content: ElementRef) {
    if (content && content.nativeElement) {
      this.bookmarkBarHeight = content.nativeElement.offsetHeight;
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  @HostListener('dragenter', ['$event']) onDragEnter(ev: DragEvent) {
    this.dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: DragEvent) {
    if (this.dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: DragEvent) {
    this.bookmarkService.createFromDrop(ev);
    this.isDragOver = false;
  }

  openEditDialog(bookmark?: Bookmark) {
    this._matDialog.open(DialogEditBookmarkComponent, {
      restoreFocus: true,
      data: {
        bookmark
      },
    }).afterClosed()
      .subscribe((bookmarkIN) => {
        if (bookmarkIN) {
          if (bookmarkIN.id) {
            this.bookmarkService.updateBookmark(bookmarkIN.id, bookmarkIN);
          } else {
            this.bookmarkService.addBookmark(bookmarkIN);
          }
        }
      });
  }

  remove(id: string) {
    this.bookmarkService.deleteBookmark(id);
  }

  trackByFn(i: number, bookmark: Bookmark) {
    return bookmark.id;
  }
}
