import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AzuredevopsIssueHeaderComponent } from './azuredevops-issue-header/azuredevops-issue-header.component';
import { AzuredevopsIssueContentComponent } from './azuredevops-issue-content/azuredevops-issue-content.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, ReactiveFormsModule],
  declarations: [AzuredevopsIssueHeaderComponent, AzuredevopsIssueContentComponent],
  exports: [AzuredevopsIssueHeaderComponent, AzuredevopsIssueContentComponent],
})
export class AzuredevopsIssueModule {}
