import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'simple-counter-button',
  templateUrl: './simple-counter-button.component.html',
  styleUrls: ['./simple-counter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterButtonComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
