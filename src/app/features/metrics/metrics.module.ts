import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationSheetComponent } from './evaluation-sheet/evaluation-sheet.component';
import { MetricsComponent } from './metrics.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { ImprovementBannerComponent } from './improvement-banner/improvement-banner.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
  ],
  declarations: [
    EvaluationSheetComponent,
    MetricsComponent,
    ImprovementBannerComponent,
  ],
  exports: [
    EvaluationSheetComponent,
    MetricsComponent,
    ImprovementBannerComponent,
  ],
  entryComponents: [
  ],
})
export class MetricsModule {
}
