import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'progress-bar',
  template: '',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBarComponent {
  @HostBinding('class') cssClass = 'bg-primary';

  @Input() set progress(_value) {
    let val;
    if (_value > 100) {
      val = 100;
    } else {
      val = _value;
    }

    if (val > 1) {
      this._elRef.nativeElement.style.visibility = 'visible';
      this._elRef.nativeElement.style.width = `${val}%`;
    } else {
      this._elRef.nativeElement.style.visibility = 'hidden';
    }
  }

  constructor(private _elRef: ElementRef) {
  }
}
