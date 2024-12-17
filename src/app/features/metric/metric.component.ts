import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { MetricService } from './metric.service';
// import { Color } from 'ng2-charts';
import { Observable } from 'rxjs';
import { LineChartData } from './metric.model';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { T } from '../../t.const';
import { ProjectMetricsService } from './project-metrics.service';
import { WorkContextService } from '../work-context/work-context.service';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  standalone: false,
})
export class MetricComponent {
  T: typeof T = T;

  productivityHappiness$: Observable<LineChartData> =
    this.metricService.getProductivityHappinessChartData$();

  simpleClickCounterData$: Observable<LineChartData> =
    this.metricService.getSimpleClickCounterMetrics$();

  simpleCounterStopWatchData$: Observable<LineChartData> =
    this.metricService.getSimpleCounterStopwatchMetrics$();

  pieChartOptions: ChartConfiguration<
    'pie' & 'pie' & 'pie',
    Array<number>,
    any
  >['options'] = {
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
    'line' & 'line' & 'line',
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

  constructor(
    public workContextService: WorkContextService,
    public metricService: MetricService,
    public projectMetricsService: ProjectMetricsService,
  ) {}
}
