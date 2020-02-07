import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild
} from '@angular/core';

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
  @ViewChild('inputElDuration') inputElDuration: ElementRef;

  @HostBinding('class.isFocused') isFocused = false;

  activeInputEl: HTMLInputElement;

  constructor() {
  }

  focusInput() {
    this.activeInputEl = (this.type === 'duration')
      ? this.inputElDuration.nativeElement
      : this.inputEl.nativeElement;


    this.isFocused = true;
    this.activeInputEl.focus();

    // if (this.type === 'text' || this.type === 'duration') {
    // this.activeInputEl.setSelectionRange(0, this.activeInputEl.value.length);
    // }
  }

  blur() {
    this.isFocused = false;

    if ((this.newValue || this.newValue === '' || this.newValue === 0) && this.newValue !== this.value) {
      this.changed.emit(this.newValue);
    }
  }

  onChange(v) {
    this.newValue = v;
  }

  keypressHandler(ev) {
    if (ev.key === 'Escape') {
      this.newValue = null;
      this.activeInputEl.blur();
    }

    if (ev.key === 'Enter') {
      this.activeInputEl.blur();
    }
  }
}
