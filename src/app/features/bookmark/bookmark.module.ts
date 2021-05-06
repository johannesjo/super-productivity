import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookmarkBarComponent } from './bookmark-bar/bookmark-bar.component';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { BookmarkEffects } from './store/bookmark.effects';
import { UiModule } from '../../ui/ui.module';
import { BOOKMARK_FEATURE_NAME, bookmarkReducer } from './store/bookmark.reducer';
import { DialogEditBookmarkComponent } from './dialog-edit-bookmark/dialog-edit-bookmark.component';
import { FormsModule } from '@angular/forms';
import { BookmarkLinkDirective } from './bookmark-link/bookmark-link.directive';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    StoreModule.forFeature(BOOKMARK_FEATURE_NAME, bookmarkReducer),
    EffectsModule.forFeature([BookmarkEffects]),
  ],
  declarations: [
    BookmarkBarComponent,
    DialogEditBookmarkComponent,
    BookmarkLinkDirective,
  ],
  exports: [BookmarkBarComponent, DialogEditBookmarkComponent],
})
export class BookmarkModule {}
