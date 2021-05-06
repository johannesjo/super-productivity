import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricPageComponent } from './metric-page.component';
import { UiModule } from '../../ui/ui.module';
import { MetricModule } from '../../features/metric/metric.module';

@NgModule({
  declarations: [MetricPageComponent],
  imports: [CommonModule, UiModule, MetricModule],
})
export class MetricPageModule {}
