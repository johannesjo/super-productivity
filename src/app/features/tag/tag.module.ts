import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {TagEffects} from './store/tag.effects';
import {TAG_FEATURE_NAME, tagReducer} from './store/tag.reducer';
import {UiModule} from '../../ui/ui.module';
import {FormsModule} from '@angular/forms';
import {TagListComponent} from './tag-list/tag-list.component';
import {FindContrastColorPipe} from './find-contrast-color.pipe';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    StoreModule.forFeature(TAG_FEATURE_NAME, tagReducer),
    EffectsModule.forFeature([TagEffects])
  ],
  declarations: [
    TagListComponent,
    FindContrastColorPipe
  ],
  exports: [
    TagListComponent
  ],
})
export class TagModule {
}
