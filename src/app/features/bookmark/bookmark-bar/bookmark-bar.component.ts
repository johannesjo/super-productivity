import { ChangeDetectionStrategy, Component, HostListener, OnDestroy } from '@angular/core';
import { BookmarkService } from '../bookmark.service';
import { MatDialog } from '@angular/material';
import { DialogEditBookmarkComponent } from '../dialog-edit-bookmark/dialog-edit-bookmark.component';
import { Bookmark } from '../bookmark.model';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';
import { Task } from '../../tasks/task.model';

@Component({
  selector: 'bookmark-bar',
  templateUrl: './bookmark-bar.component.html',
  styleUrls: ['./bookmark-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
})
export class BookmarkBarComponent implements OnDestroy {
  isDragOver = false;
  isEditMode = true;
  dragEnterTarget: HTMLElement;
  LIST_ID = 'BOOKMARKS';

  private _subs = new Subscription();

  constructor(
    public readonly bookmarkService: BookmarkService,
    private readonly _matDialog: MatDialog,
    private _dragulaService: DragulaService,
  ) {
    this._subs.add(this._dragulaService.dropModel(this.LIST_ID)
      .subscribe((params: any) => {
        const {target, source, targetModel, item} = params;
        console.log(target, source, targetModel, item);
        // if (this.listEl.nativeElement === target) {
        //   this._blockAnimation();
        //
        //   const sourceModelId = source.dataset.id;
        //   const targetModelId = target.dataset.id;
        //   const targetNewIds = targetModel.map((task) => task.id);
        //   const movedTaskId = item.id;
        //   this._taskService.move(movedTaskId, sourceModelId, targetModelId, targetNewIds);
        // }
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
    if (this.dragEnterTarget === (event.target as HTMLElement)) {
      event.preventDefault();
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
