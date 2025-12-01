import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  Input,
} from '@angular/core';

@Component({
  selector: 'progress-bar',
  template: '',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ProgressBarComponent {
  private _elRef = inject(ElementRef);

  // TODO: Skipped for migration because:
  //  This input is used in combination with `@HostBinding` and migrating would
  //  break.
  @HostBinding('class') @Input() cssClass: string = 'bg-primary';

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set progress(_value: number) {
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
}
