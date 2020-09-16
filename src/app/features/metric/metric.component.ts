import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChartOptions, ChartType } from 'chart.js';
import { MetricService } from './metric.service';
import { Color } from 'ng2-charts';
import { Observable } from 'rxjs';
import { LineChartData } from './metric.model';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { T } from '../../t.const';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
})
export class MetricComponent {
  T: typeof T = T;

  productivityHappiness$: Observable<LineChartData> = this.metricService.getProductivityHappinessChartData$();

  pieChartOptions: ChartOptions = {
    responsive: true,
    legend: {
      position: 'top',
    },
  };
  pieChartType: ChartType = 'pie';
  pieChartPlugins: any[] = [];

  lineChartOptions: ChartOptions = {
    responsive: true,
  };
  lineChartColors: Color[] = [];
  lineChartLegend: boolean = true;
  lineChartType: ChartType = 'line';
  lineChartPlugins: any[] = [];

  constructor(
    public metricService: MetricService,
  ) {
  }
}
