import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationSheetComponent } from './evaluation-sheet/evaluation-sheet.component';
import { MetricComponent } from './metric.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { ImprovementBannerComponent } from './improvement-banner/improvement-banner.component';
import { StoreModule } from '@ngrx/store';
import { METRIC_FEATURE_NAME, metricReducer } from './store/metric.reducer';
import { EffectsModule } from '@ngrx/effects';
import { MetricEffects } from './store/metric.effects';
import { ObstructionModule } from './obstruction/obstruction.module';
import { ImprovementModule } from './improvement/improvement.module';
import { ChartsModule } from 'ng2-charts';
import { RouterModule } from '@angular/router';
import { MigrateMetricService } from './migrate-metric.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    ObstructionModule,
    ImprovementModule,
    ChartsModule,
    StoreModule.forFeature(METRIC_FEATURE_NAME, metricReducer),
    EffectsModule.forFeature([MetricEffects]),
    RouterModule,
  ],
  declarations: [EvaluationSheetComponent, MetricComponent, ImprovementBannerComponent],
  exports: [EvaluationSheetComponent, MetricComponent, ImprovementBannerComponent],
})
export class MetricModule {
  constructor(private _migrateMetricService: MigrateMetricService) {
    this._migrateMetricService.checkMigrate();
  }

  // constructor(
  //   private _metricsService: MetricService,
  //   private _improvementService: ImprovementService,
  //   private _obstructionService: ObstructionService,
  // ) {
  //   setTimeout(() => {
  //     combineLatest([
  //       _obstructionService.obstructions$,
  //       _improvementService.improvements$,
  //     ]).pipe(take(3)).subscribe(([ob, imp]) => {
  //       console.log('I am here!', ob, imp);
  //
  //       if (ob && ob.length && imp && imp.length) {
  //         const rnd = (max = 10, min = 0) => Math.floor(Math.random() * (max - min) + min);
  //         const rndRange = (max = 10, min = 0): [number, number] => {
  //           const start = rnd(max, min);
  //           return [start, rnd(max, start)];
  //         };
  //         const improvements = imp.map(imp_ => imp_.id);
  //         const obstructions = ob.map(ob_ => ob_.id);
  //
  //         for (let i = 0; i < 50; i++) {
  //           console.log(...(rndRange(5, 0)));
  //
  //           const metric: Metric = {
  //             id: `${rnd(2018, 1989)}-${rnd(10, 12)}-${rnd(10, 28)}`,
  //             improvements: improvements.slice(...(rndRange(improvements.length, 0))),
  //             obstructions: obstructions.slice(...(rndRange(obstructions.length, 0))),
  //             improvementsTomorrow: improvements.slice(...(rndRange(improvements.length, 0))),
  //             productivity: rnd(10, 1),
  //             mood: rnd(10, 1),
  //           };
  //           console.log(metric);
  //           this._metricsService.upsertMetric(metric);
  //         }
  //
  //       }
  //     });
  //   }, 300);
  // }
}
