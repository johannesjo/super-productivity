import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'metric-page',
  templateUrl: './metric-page.component.html',
  styleUrls: ['./metric-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricPageComponent {
  constructor() {
  }
}
