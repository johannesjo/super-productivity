import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import { nanoid } from 'nanoid';
import moment from 'moment';
import { dotAnimation } from './dot.ani';
import { T } from '../../../t.const';
import { InputDurationDirective } from '../input-duration.directive';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'input-duration-slider',
  templateUrl: './input-duration-slider.component.html',
  styleUrls: ['./input-duration-slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [dotAnimation],
  imports: [InputDurationDirective, FormsModule, TranslatePipe],
})
export class InputDurationSliderComponent implements OnInit, OnDestroy {
  private _el = inject(ElementRef);
  private _cd = inject(ChangeDetectorRef);

  T: typeof T = T;
  minutesBefore: number = 0;
  dots: any[] = [];
  uid: string = 'duration-input-slider' + nanoid();
  el: HTMLElement;

  startHandler?: (ev: any) => void;
  endHandler?: () => void;
  moveHandler?: (ev: any) => void;

  readonly circleEl = viewChild<ElementRef>('circleEl');

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() label: string = '';
  readonly modelChange = output<number>();

  constructor() {
    this.el = this._el.nativeElement;
  }

  _model: number = 0;

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set model(val: number) {
    if (this._model !== val) {
      this._model = val;
      this.setRotationFromValue(val);
    }
  }

  ngOnInit(): void {
    this.startHandler = (ev) => {
      if (!this.endHandler || !this.moveHandler || !this.circleEl()) {
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
      if (
        ev.type === 'click' &&
        (ev.target.tagName === 'LABEL' || ev.target.tagName === 'INPUT')
      ) {
        return;
      }
      const circleEl = this.circleEl();
      if (!this.endHandler || !this.moveHandler || !circleEl) {
        throw new Error();
      }

      // prevent touchmove
      ev.preventDefault();

      const convertThetaToCssDegrees = (thetaIN: number): number => 90 - thetaIN;

      const centerX = circleEl.nativeElement.offsetWidth / 2;
      const centerY = circleEl.nativeElement.offsetHeight / 2;

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
      if (!this.endHandler || !this.moveHandler || !this.circleEl()) {
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

  ngOnDestroy(): void {
    if (!this.endHandler || !this.moveHandler || !this.startHandler || !this.circleEl()) {
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

  setCircleRotation(cssDegrees: number): void {
    const circleEl = this.circleEl();
    if (!circleEl) {
      throw new Error();
    }
    circleEl.nativeElement.style.transform = 'rotate(' + cssDegrees + 'deg)';
  }

  setDots(hours: number = 0): void {
    if (hours > 12) {
      hours = 12;
    }
    // prevent errors for negative values
    if (hours <= 0) {
      hours = 0;
    }

    this.dots = new Array(hours);
  }

  setValueFromRotation(degrees: number): void {
    const THRESHOLD = 40;

    let minutesFromDegrees;
    // NOTE: values are negative for the last quadrant
    if (degrees >= 0) {
      minutesFromDegrees = (degrees / 360) * 60;
    } else {
      minutesFromDegrees = ((degrees + 360) / 360) * 60;
    }

    minutesFromDegrees = Math.round(minutesFromDegrees / 5) * 5;

    if (minutesFromDegrees >= 60) {
      minutesFromDegrees = 0;
    }

    let hours = Math.floor(
      moment
        .duration({
          milliseconds: this._model,
        })
        .asHours(),
    );

    const minuteDelta = minutesFromDegrees - this.minutesBefore;

    if (minuteDelta > THRESHOLD) {
      hours--;
    } else if (-1 * minuteDelta > THRESHOLD) {
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
    this._model = moment
      .duration({
        hours,
        minutes: minutesFromDegrees,
      })
      .asMilliseconds();

    this.modelChange.emit(this._model);
    this._cd.detectChanges();
  }

  onInputChange($event: number): void {
    this._model = $event;
    this.modelChange.emit(this._model);
    this.setRotationFromValue();
  }

  setRotationFromValue(val: number = this._model): void {
    const momentVal = moment.duration({
      milliseconds: val,
    });

    const minutes = momentVal.minutes();
    this.setDots(Math.floor(momentVal.asHours()));
    const degrees = (minutes * 360) / 60;
    this.minutesBefore = minutes;
    this.setCircleRotation(degrees);
    this._cd.detectChanges();
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
