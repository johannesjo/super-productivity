import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {SimpleCounter, SimpleCounterType} from '../simple-counter.model';

@Component({
  selector: 'simple-counter-button',
  templateUrl: './simple-counter-button.component.html',
  styleUrls: ['./simple-counter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterButtonComponent implements OnInit {
  isOn: boolean;
  SimpleCounterType = SimpleCounterType;

  @Input() simpleCounter: SimpleCounter;

  constructor() {
  }

  ngOnInit() {
  }

  toggleStopwatch() {
    this.isOn = !this.isOn;
  }

  toggleCounter() {
    this.simpleCounter = {
      ...this.simpleCounter,
      count: this.simpleCounter.count + 1
    };
  }

  reset() {

  }

  edit() {
  }
}
