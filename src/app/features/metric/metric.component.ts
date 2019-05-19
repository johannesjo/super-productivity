import {ChangeDetectionStrategy, Component} from '@angular/core';
import {WorklogService} from '../worklog/worklog.service';
import {ChartOptions, ChartType} from 'chart.js';
import {MetricService} from './metric.service';
import {Color} from 'ng2-charts';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricComponent {
  public pieChartOptions: ChartOptions = {
    responsive: true,
    legend: {
      position: 'top',
    },
  };
  public pieChartType: ChartType = 'pie';
  public pieChartLegend = true;
  public pieChartPlugins = [];

  public lineChartOptions: ChartOptions = {
    responsive: true,
  };
  public lineChartColors: Color[] = [];
  public lineChartLegend = true;
  public lineChartType: ChartType = 'line';
  public lineChartPlugins = [];

  constructor(
    public worklogService: WorklogService,
    public metricService: MetricService,
  ) {
  }
}
