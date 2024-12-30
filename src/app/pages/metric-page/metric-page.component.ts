import { ChangeDetectionStrategy, Component } from '@angular/core';
import { T } from '../../t.const';
import { MetricModule } from '../../features/metric/metric.module';

@Component({
  selector: 'metric-page',
  templateUrl: './metric-page.component.html',
  styleUrls: ['./metric-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MetricModule],
})
export class MetricPageComponent {
  T: typeof T = T;

  constructor() {}
}
