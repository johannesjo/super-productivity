import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
import { BookmarkService } from '../bookmark.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditBookmarkComponent } from '../dialog-edit-bookmark/dialog-edit-bookmark.component';
import { Bookmark } from '../bookmark.model';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { slideAnimation } from '../../../ui/animations/slide.ani';
import { T } from '../../../t.const';
import { moveItemInArray } from '../../../util/move-item-in-array';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'bookmark-bar',
  templateUrl: './bookmark-bar.component.html',
  styleUrls: ['./bookmark-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, slideAnimation],
  standalone: false,
})
export class BookmarkBarComponent {
  isDragOver: boolean = false;
  isEditMode: boolean = false;
  dragEnterTarget?: HTMLElement;
  T: typeof T = T;
  isContextMenuDisabled: boolean = false;
  bookmarkBarHeight: number = 50;

  constructor(
    public readonly bookmarkService: BookmarkService,
    private readonly _matDialog: MatDialog,
  ) {}

  // TODO: Skipped for migration because:
  //  Accessor queries cannot be migrated as they are too complex.
  @ViewChild('bookmarkBar', { read: ElementRef }) set bookmarkBarEl(content: ElementRef) {
    if (content && content.nativeElement) {
      this.bookmarkBarHeight = content.nativeElement.offsetHeight;
    }
  }

  drop(event: CdkDragDrop<Bookmark[]>): void {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const bookmarks = event.container.data;

    this.bookmarkService.reorderBookmarks(
      moveItemInArray(bookmarks, previousIndex, currentIndex).map(
        (bookmark) => bookmark.id,
      ),
    );
  }

  @HostListener('dragenter', ['$event']) onDragEnter(ev: DragEvent): void {
    this.dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: DragEvent): void {
    if (this.dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: DragEvent): void {
    this.bookmarkService.createFromDrop(ev);
    this.isDragOver = false;
  }

  openEditDialog(bookmark?: Bookmark): void {
    this._matDialog
      .open(DialogEditBookmarkComponent, {
        restoreFocus: true,
        data: {
          bookmark,
        },
      })
      .afterClosed()
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

  remove(id: string): void {
    this.bookmarkService.deleteBookmark(id);
  }

  trackByFn(i: number, bookmark: Bookmark): string {
    return bookmark.id;
  }
}
