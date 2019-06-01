import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ChartOptions, ChartType} from 'chart.js';
import {MetricService} from './metric.service';
import {Color} from 'ng2-charts';
import {Observable} from 'rxjs';
import {LineChartData} from './metric.model';
import {fadeAnimation} from '../../ui/animations/fade.ani';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
})
export class MetricComponent {
  public productivityHappiness$: Observable<LineChartData> = this.metricService.getProductivityHappinessChartData$();

  public pieChartOptions: ChartOptions = {
    responsive: true,
    legend: {
      position: 'top',
    },
  };
  public pieChartType: ChartType = 'pie';
  public pieChartPlugins = [];

  public lineChartOptions: ChartOptions = {
    responsive: true,
  };
  public lineChartColors: Color[] = [];
  public lineChartLegend = true;
  public lineChartType: ChartType = 'line';
  public lineChartPlugins = [];

  constructor(
    public metricService: MetricService,
  ) {
  }
}
