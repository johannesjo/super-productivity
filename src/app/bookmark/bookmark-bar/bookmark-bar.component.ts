import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BookmarkService } from '../bookmark.service';
import { MatDialog } from '@angular/material';
import { DialogEditBookmarkComponent } from '../dialog-edit-bookmark/dialog-edit-bookmark.component';

@Component({
  selector: 'bookmark-bar',
  templateUrl: './bookmark-bar.component.html',
  styleUrls: ['./bookmark-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookmarkBarComponent implements OnInit {
  bookmarks = [
    {title: 'asd', icon: 'pause', type: 'LINK'},
    {title: 'Something else', icon: 'pause', type: 'LINK'},
    {title: 'very long', icon: 'pause', type: 'LINK'},
    {title: 'very long', icon: 'pause', type: 'LINK'},
  ];

  constructor(
    public readonly bookmarkService: BookmarkService,
    private readonly _matDialog: MatDialog,
  ) {
  }

  ngOnInit() {
  }

  openEditDialog(bookmark) {
    this._matDialog.open(DialogEditBookmarkComponent, {
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
}
