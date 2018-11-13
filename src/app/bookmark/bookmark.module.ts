import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookmarkBarComponent } from './bookmark-bar/bookmark-bar.component';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { BookmarkEffects } from './store/bookmark.effects';
import { CoreModule } from '../core/core.module';
import { UiModule } from '../ui/ui.module';
import { BOOKMARK_FEATURE_NAME, bookmarkReducer } from './store/bookmark.reducer';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    StoreModule.forFeature(BOOKMARK_FEATURE_NAME, bookmarkReducer),
    EffectsModule.forFeature([BookmarkEffects])
  ],
  declarations: [BookmarkBarComponent]
})
export class BookmarkModule {
}
