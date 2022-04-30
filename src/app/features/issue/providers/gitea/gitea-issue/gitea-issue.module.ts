import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GiteaIssueContentComponent } from './gitea-issue-content/gitea-issue-content.component';
import { GiteaIssueHeaderComponent } from './gitea-issue-header/gitea-issue-header.component';

@NgModule({
  declarations: [GiteaIssueContentComponent, GiteaIssueHeaderComponent],
  imports: [CommonModule, UiModule, FormsModule, ReactiveFormsModule],
  exports: [GiteaIssueContentComponent, GiteaIssueHeaderComponent],
})
export class GiteaIssueModule {}
