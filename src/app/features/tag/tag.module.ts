import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { TagEffects } from './store/tag.effects';
import { TAG_FEATURE_NAME, tagReducer } from './store/tag.reducer';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TagListComponent } from './tag-list/tag-list.component';
import { DialogEditTagsForTaskComponent } from './dialog-edit-tags/dialog-edit-tags-for-task.component';
import { TagComponent } from './tag/tag.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    StoreModule.forFeature(TAG_FEATURE_NAME, tagReducer),
    EffectsModule.forFeature([TagEffects]),
  ],
  declarations: [
    TagListComponent,
    DialogEditTagsForTaskComponent,
    TagComponent,
    // FindContrastColorPipe
  ],
  exports: [DialogEditTagsForTaskComponent, TagListComponent, TagComponent],
})
export class TagModule {}
