import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'simple-counter-cfg',
  templateUrl: './simple-counter-cfg.component.html',
  styleUrls: ['./simple-counter-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterCfgComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
