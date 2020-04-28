import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {SimpleCounter} from '../simple-counter.model';

@Component({
  selector: 'simple-counter-button',
  templateUrl: './simple-counter-button.component.html',
  styleUrls: ['./simple-counter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterButtonComponent implements OnInit {
  isOn: boolean;
  simpleCounter: SimpleCounter;

  constructor() {
  }

  ngOnInit() {
  }

  toggle() {
    this.isOn = !this.isOn;
  }

  reset() {

  }

  edit() {}
}
