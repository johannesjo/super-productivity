import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { BookmarkEffects } from './store/bookmark.effects';
import { BOOKMARK_FEATURE_NAME, bookmarkReducer } from './store/bookmark.reducer';

@NgModule({
  imports: [
    StoreModule.forFeature(BOOKMARK_FEATURE_NAME, bookmarkReducer),
    EffectsModule.forFeature([BookmarkEffects]),
  ],
  exports: [],
})
export class BookmarkModule {}
