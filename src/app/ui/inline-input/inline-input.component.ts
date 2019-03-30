import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';

@Component({
  selector: 'inline-input',
  templateUrl: './inline-input.component.html',
  styleUrls: ['./inline-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineInputComponent {
  @Input() type = 'text';
  @Input() value: string | number;
  @Input() displayValue: string;
  @Input() newValue: string | number;
  @Output() changed = new EventEmitter<string | number>();
  @ViewChild('inputEl') inputEl: ElementRef;

  constructor() {
  }


  focusInput() {
    this.inputEl.nativeElement.focus();
    this.inputEl.nativeElement.setSelectionRange(0, this.inputEl.nativeElement.value.length);
  }

  blur() {
    if (this.newValue || this.newValue === '' || this.newValue === 0) {
      this.changed.emit(this.newValue);
    }
  }

  onChange(v) {
    this.newValue = v;
  }

  keypressHandler(ev) {
    if (ev.key === 'Escape') {
      this.newValue = null;
      this.inputEl.nativeElement.blur();
    }

    if (ev.key === 'Enter') {
      this.inputEl.nativeElement.blur();
    }
  }
}
