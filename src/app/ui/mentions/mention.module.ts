import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MentionDirective } from './mention.directive';
import { MentionListComponent } from './mention-list.component';

@NgModule({
  imports: [CommonModule, MentionDirective, MentionListComponent],
  exports: [MentionDirective, MentionListComponent],
})
export class MentionModule {}
