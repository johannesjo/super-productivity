import { ChangeDetectionStrategy, Component } from '@angular/core';
import { T } from '../../t.const';

@Component({
  selector: 'metric-page',
  templateUrl: './metric-page.component.html',
  styleUrls: ['./metric-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricPageComponent {
  T: typeof T = T;

  constructor() {
  }
}
