import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchBarComponent } from './search-bar.component';
import { IssueModule } from '../issue/issue.module';
import { UiModule } from 'src/app/ui/ui.module';
import { TagModule } from '../tag/tag.module';

@NgModule({
  declarations: [SearchBarComponent],
  imports: [CommonModule, IssueModule, UiModule, TagModule],
  exports: [SearchBarComponent],
})
export class SearchBarModule {}
