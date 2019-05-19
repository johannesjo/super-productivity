import {ChangeDetectionStrategy, Component} from '@angular/core';
import {WorklogService} from '../worklog/worklog.service';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricComponent {

  constructor(
    public worklogService: WorklogService,
  ) {
  }
}
