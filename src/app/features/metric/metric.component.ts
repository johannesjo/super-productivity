import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { MetricService } from './metric.service';
// import { Color } from 'ng2-charts';
import { Observable } from 'rxjs';
import { LineChartData } from './metric.model';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { T } from '../../t.const';
import { ProjectMetricsService } from './project-metrics.service';
import { WorkContextService } from '../work-context/work-context.service';
import { BaseChartDirective } from 'ng2-charts';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { MsToStringPipe } from '../../ui/duration/ms-to-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [BaseChartDirective, AsyncPipe, DecimalPipe, MsToStringPipe, TranslatePipe],
})
export class MetricComponent {
  workContextService = inject(WorkContextService);
  metricService = inject(MetricService);
  projectMetricsService = inject(ProjectMetricsService);

  T: typeof T = T;

  productivityHappiness$: Observable<LineChartData> =
    this.metricService.getProductivityHappinessChartData$();

  simpleClickCounterData$: Observable<LineChartData> =
    this.metricService.getSimpleClickCounterMetrics$();

  simpleCounterStopWatchData$: Observable<LineChartData> =
    this.metricService.getSimpleCounterStopwatchMetrics$();

  pieChartOptions: ChartConfiguration<'pie', Array<number>, any>['options'] = {
    scales: {
      x: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
    },
    responsive: true,
  };
  pieChartType: ChartType = 'pie';

  lineChartOptions: ChartConfiguration<
    'line',
    (number | undefined)[],
    string
  >['options'] = {
    responsive: true,
    scales: {
      y: {
        ticks: {
          precision: 0,
        },
      },
    },
  };
  lineChartType: ChartType = 'line';
}
