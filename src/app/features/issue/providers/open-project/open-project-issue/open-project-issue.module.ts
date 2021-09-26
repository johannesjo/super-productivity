import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OpenProjectIssueHeaderComponent } from './open-project-issue-header/open-project-issue-header.component';
import { OpenProjectIssueContentComponent } from './open-project-issue-content/open-project-issue-content.component';
import { EffectsModule } from '@ngrx/effects';
import { OpenProjectEffects } from './store/open-project.effects';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    EffectsModule.forFeature([OpenProjectEffects]),
  ],
  declarations: [OpenProjectIssueHeaderComponent, OpenProjectIssueContentComponent],
  exports: [OpenProjectIssueHeaderComponent, OpenProjectIssueContentComponent],
})
export class OpenProjectIssueModule {}
