import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
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
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatIcon } from '@angular/material/icon';
import { MatAnchor, MatButton } from '@angular/material/button';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { BookmarkLinkDirective } from '../bookmark-link/bookmark-link.directive';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { EnlargeImgDirective } from '../../../ui/enlarge-img/enlarge-img.directive';

@Component({
  selector: 'bookmark-bar',
  templateUrl: './bookmark-bar.component.html',
  styleUrls: ['./bookmark-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, slideAnimation],
  imports: [
    MatIcon,
    MatButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    CdkDropList,
    CdkDrag,
    MatAnchor,
    BookmarkLinkDirective,

    AsyncPipe,
    TranslatePipe,
    EnlargeImgDirective,
  ],
})
export class BookmarkBarComponent {
  readonly bookmarkService = inject(BookmarkService);
  private readonly _matDialog = inject(MatDialog);

  isDragOver: boolean = false;
  isEditMode: boolean = false;
  dragEnterTarget?: HTMLElement;
  T: typeof T = T;
  isContextMenuDisabled: boolean = false;
  bookmarkBarHeight: number = 50;

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
