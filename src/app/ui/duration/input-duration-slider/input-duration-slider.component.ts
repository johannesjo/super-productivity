import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import * as shortid from 'shortid';
import * as moment from 'moment';
import { dotAnimation } from './dot.ani';
import { T } from '../../../t.const';

@Component({
  selector: 'input-duration-slider',
  templateUrl: './input-duration-slider.component.html',
  styleUrls: ['./input-duration-slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [dotAnimation],
})
export class InputDurationSliderComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  minutesBefore: number = 0;
  dots: any[] = [];
  uid: string = 'duration-input-slider' + shortid();
  el: HTMLElement;

  startHandler?: (ev: any) => void;
  endHandler?: () => void;
  moveHandler?: (ev: any) => void;

  @ViewChild('circleEl', {static: true}) circleEl?: ElementRef;

  @Input() label: string = '';
  @Output() modelChange: EventEmitter<number> = new EventEmitter();

  constructor(
    private _el: ElementRef,
    private _cd: ChangeDetectorRef,
  ) {
    this.el = this._el.nativeElement;
  }

  _model: number = 0;

  @Input() set model(val: number) {
    if (this._model !== val) {
      this._model = val;
      this.setRotationFromValue(val);
    }
  }

  ngOnInit() {
    this.startHandler = (ev) => {

      if (!this.endHandler || !this.moveHandler || !this.circleEl) {
        throw new Error();
      }

      // don't execute when clicked on label or input
      if (ev.target.tagName === 'LABEL' || ev.target.tagName === 'INPUT') {
        this.endHandler();
        return;
      }

      this.el.addEventListener('mousemove', this.moveHandler);
      document.addEventListener('mouseup', this.endHandler);

      this.el.addEventListener('touchmove', this.moveHandler);
      document.addEventListener('touchend', this.endHandler);

      this.el.classList.add('is-dragging');
    };

    this.moveHandler = (ev) => {
      if (ev.type === 'click' &&
        (ev.target.tagName === 'LABEL' ||
          ev.target.tagName === 'INPUT')) {
        return;
      }
      if (!this.endHandler || !this.moveHandler || !this.circleEl) {
        throw new Error();
      }

      // prevent touchmove
      ev.preventDefault();

      function convertThetaToCssDegrees(thetaIN: number) {
        return 90 - thetaIN;
      }

      const centerX = this.circleEl.nativeElement.offsetWidth / 2;
      const centerY = this.circleEl.nativeElement.offsetHeight / 2;

      let offsetX;

      let offsetY;
      if (ev.type === 'touchmove') {
        const rect = ev.target.getBoundingClientRect();
        offsetX = ev.targetTouches[0].pageX - rect.left;
        offsetY = ev.targetTouches[0].pageY - rect.top;
      } else {
        offsetX = ev.offsetX;
        offsetY = ev.offsetY;
      }

      const x = offsetX - centerX;
      const y = -1 * (offsetY - centerY);

      const theta = Math.atan2(y, x) * (180 / Math.PI);

      const cssDegrees = Math.round(convertThetaToCssDegrees(theta));
      this.setValueFromRotation(cssDegrees);
    };

    this.endHandler = () => {
      if (!this.endHandler || !this.moveHandler || !this.circleEl) {
        throw new Error();
      }

      this.el.classList.remove('is-dragging');
      this.el.removeEventListener('mousemove', this.moveHandler);
      document.removeEventListener('mouseup', this.endHandler);

      this.el.removeEventListener('touchmove', this.moveHandler);
      document.removeEventListener('touchend', this.endHandler);
    };

    this.el.addEventListener('mousedown', this.startHandler);
    this.el.addEventListener('touchstart', this.startHandler);

    this.el.addEventListener('click', this.moveHandler);

    this.setRotationFromValue();
  }

  ngOnDestroy() {
    if (!this.endHandler || !this.moveHandler || !this.startHandler || !this.circleEl) {
      throw new Error();
    }

    // remove mouse events
    this.el.removeEventListener('mousedown', this.startHandler);
    this.el.removeEventListener('mousemove', this.moveHandler);
    document.removeEventListener('mouseup', this.endHandler);

    // remove touch events
    this.el.removeEventListener('touchstart', this.startHandler);
    this.el.removeEventListener('touchmove', this.moveHandler);
    document.removeEventListener('touchend', this.endHandler);
  }

  setCircleRotation(cssDegrees: number) {
    if (!this.circleEl) {
      throw new Error();
    }
    this.circleEl.nativeElement.style.transform = 'rotate(' + cssDegrees + 'deg)';
  }

  setDots(hours: number = 0) {
    if (hours > 12) {
      hours = 12;
    }
    console.log(hours);

    this.dots = new Array(hours);
  }

  setValueFromRotation(degrees: number) {
    const THRESHOLD = 40;

    let minutesFromDegrees;
    // NOTE: values are negative for the last quadrant
    if (degrees >= 0) {
      minutesFromDegrees = (degrees / 360 * 60);
    } else {
      minutesFromDegrees = ((degrees + 360) / 360 * 60);
    }

    minutesFromDegrees = Math.round(minutesFromDegrees / 5) * 5;

    if (minutesFromDegrees >= 60) {
      minutesFromDegrees = 0;
    }

    let hours = Math.floor(moment.duration({
      milliseconds: this._model
    }).asHours());

    const minuteDelta = minutesFromDegrees - this.minutesBefore;

    if (minuteDelta > THRESHOLD) {
      hours--;
    } else if ((-1 * minuteDelta) > THRESHOLD) {
      hours++;
    }

    if (hours < 0) {
      hours = 0;
      minutesFromDegrees = 0;
      this.setCircleRotation(0);
    } else {
      this.setCircleRotation(minutesFromDegrees * 6);
    }

    this.minutesBefore = minutesFromDegrees;
    this.setDots(hours);
    this._model = moment.duration({
      hours,
      minutes: minutesFromDegrees
    }).asMilliseconds();

    this.modelChange.emit(this._model);
    this._cd.detectChanges();
  }

  onInputChange($event: number) {
    this._model = $event;
    this.modelChange.emit(this._model);
    this.setRotationFromValue();
  }

  setRotationFromValue(val: number = this._model) {
    console.log(val);
    const momentVal = moment.duration({
      milliseconds: val
    });

    const minutes = momentVal.minutes();
    this.setDots(Math.floor(momentVal.asHours()));
    const degrees = minutes * 360 / 60;
    this.minutesBefore = minutes;
    this.setCircleRotation(degrees);
    this._cd.detectChanges();
  }

  trackByIndex(i: number, p: any) {
    return i;
  }
}
