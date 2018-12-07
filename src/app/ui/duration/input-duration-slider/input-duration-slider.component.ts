import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import shortid from 'shortid';
import * as moment from 'moment';

@Component({
  selector: 'input-duration-slider',
  templateUrl: './input-duration-slider.component.html',
  styleUrls: ['./input-duration-slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputDurationSliderComponent implements OnInit, OnDestroy {
  @Input() ngModel;
  minutesBefore = 0;
  dots: any[];
  uid: string = 'duration-input-slider' + shortid();
  el: HTMLElement;

  startHandler: (ev: any) => void;
  endHandler: () => void;
  moveHandler: (ev: any) => void;

  @ViewChild('circleEl') circleEl: ElementRef;

  constructor(
    private _el: ElementRef,
    private _cd: ChangeDetectorRef,
  ) {
    this.el = _el.nativeElement;
  }

  ngOnInit() {
    this.startHandler = (ev) => {
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
        ev.target.tagName === 'LABEL' ||
        ev.target.tagName === 'INPUT') {
        return;
      }

      // prevent touchmove
      ev.preventDefault();

      function convertThetaToCssDegrees(theta_) {
        return 90 - theta_;
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
    // remove mouse events
    this.el.removeEventListener('mousedown', this.startHandler);
    this.el.removeEventListener('mousemove', this.moveHandler);
    document.removeEventListener('mouseup', this.endHandler);

    // remove touch events
    this.el.removeEventListener('touchstart', this.startHandler);
    this.el.removeEventListener('touchmove', this.moveHandler);
    document.removeEventListener('touchend', this.endHandler);
  }

  setCircleRotation(cssDegrees) {
    this.circleEl.nativeElement.style.transform = 'rotate(' + cssDegrees + 'deg)';
  }

  setDots(hours) {
    if (hours > 12) {
      hours = 12;
    }
    this.dots = new Array(hours);
  }

  setValueFromRotation(degrees) {
    let minutesFromDegrees;
    // NOTE: values are negative for the last quadrant
    if (degrees >= 0) {
      minutesFromDegrees = (degrees / 360 * 60);
    } else {
      minutesFromDegrees = ((degrees + 360) / 360 * 60);
    }

    minutesFromDegrees = Math.round(minutesFromDegrees);
    //// should be 5 min values
    // minutesFromDegrees = Math.round(minutesFromDegrees / 5) * 5;

    let hours = Math.floor(moment.duration(this.ngModel).asHours());

    const minuteDelta = minutesFromDegrees - this.minutesBefore;
    const threshold = 40;
    if (minuteDelta > threshold) {
      hours--;
    } else if (-1 * minuteDelta > threshold) {
      hours++;
    }

    if (hours < 0) {
      hours = 0;
      minutesFromDegrees = 0;
      this.setCircleRotation(0);
    } else {
      this.setCircleRotation(degrees);
    }

    this.minutesBefore = minutesFromDegrees;
    this.setDots(hours);
    this.ngModel = moment.duration({
      hours: hours,
      minutes: minutesFromDegrees
    }).asMilliseconds();
    this._cd.detectChanges();
  }

  setRotationFromValue(val = this.ngModel) {
    const momentVal = moment.duration({
      milliseconds: val
    });
    console.log(momentVal);
    const minutes = momentVal.minutes();
    this.setDots(Math.floor(momentVal.asHours()));
    const degrees = minutes * 360 / 60;
    this.minutesBefore = minutes;
    this.setCircleRotation(degrees);
    this._cd.detectChanges();
  }
}
