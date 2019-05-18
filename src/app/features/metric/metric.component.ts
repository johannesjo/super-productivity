import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

}
