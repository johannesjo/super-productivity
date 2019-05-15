import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationQuestionsComponent } from './evaluation-questions/evaluation-questions.component';
import { MetricsComponent } from './metrics.component';
import { DialogImprovementSuggestionsComponent } from './dialog-improvement-suggestions/dialog-improvement-suggestions.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
  ],
  declarations: [
    EvaluationQuestionsComponent,
    MetricsComponent,
    DialogImprovementSuggestionsComponent,
  ],
  exports: [
    EvaluationQuestionsComponent,
    MetricsComponent,
    DialogImprovementSuggestionsComponent,
  ],
  entryComponents: [
    DialogImprovementSuggestionsComponent,
  ],
})
export class MetricsModule {
}
