import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationSheetComponent } from './evaluation-sheet/evaluation-sheet.component';
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
    EvaluationSheetComponent,
    MetricsComponent,
    DialogImprovementSuggestionsComponent,
  ],
  exports: [
    EvaluationSheetComponent,
    MetricsComponent,
    DialogImprovementSuggestionsComponent,
  ],
  entryComponents: [
    DialogImprovementSuggestionsComponent,
  ],
})
export class MetricsModule {
}
