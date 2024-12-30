import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchBarComponent } from './search-bar.component';
import { UiModule } from 'src/app/ui/ui.module';
import { TagModule } from '../tag/tag.module';

@NgModule({
  declarations: [SearchBarComponent],
  imports: [CommonModule, UiModule, TagModule],
  exports: [SearchBarComponent],
})
export class SearchBarModule {}
