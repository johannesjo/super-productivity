import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {SimpleCounter, SimpleCounterType} from '../simple-counter.model';
import {SimpleCounterService} from '../simple-counter.service';

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

  constructor(
    private _simpleCounterService: SimpleCounterService,
  ) {
  }

  ngOnInit() {
  }

  toggleStopwatch() {
    this._simpleCounterService.toggleCounter(this.simpleCounter.id);
  }

  toggleCounter() {
    this._simpleCounterService.increaseCounterToday(this.simpleCounter.id, 1);
  }

  reset() {
    this._simpleCounterService.setCounterToday(this.simpleCounter.id, 0);
  }

  edit() {
    // TODO implement
  }
}
