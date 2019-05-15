import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'metrics',
  templateUrl: './metrics.component.html',
  styleUrls: ['./metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
