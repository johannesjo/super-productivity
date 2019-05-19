import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {EvaluationSheetComponent} from './evaluation-sheet/evaluation-sheet.component';
import {MetricComponent} from './metric.component';
import {FormsModule} from '@angular/forms';
import {UiModule} from '../../ui/ui.module';
import {ImprovementBannerComponent} from './improvement-banner/improvement-banner.component';
import {StoreModule} from '@ngrx/store';
import {METRIC_FEATURE_NAME, metricReducer} from './store/metric.reducer';
import {EffectsModule} from '@ngrx/effects';
import {MetricEffects} from './store/metric.effects';
import {ObstructionModule} from './obstruction/obstruction.module';
import {ImprovementModule} from './improvement/improvement.module';
import {ChartsModule} from 'ng2-charts';
import { MyLineChartComponent } from './my-line-chart/my-line-chart.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    ObstructionModule,
    ImprovementModule,
    ChartsModule,
    StoreModule.forFeature(METRIC_FEATURE_NAME, metricReducer),
    EffectsModule.forFeature([MetricEffects])
  ],
  declarations: [
    EvaluationSheetComponent,
    MetricComponent,
    ImprovementBannerComponent,
    MyLineChartComponent,
  ],
  exports: [
    EvaluationSheetComponent,
    MetricComponent,
    ImprovementBannerComponent,
  ],
  entryComponents: [],
})
export class MetricModule {
}
