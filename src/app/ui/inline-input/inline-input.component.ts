import {
  AfterViewInit,
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
export class InlineInputComponent implements AfterViewInit {
  @Input() type: 'text' | 'duration' = 'text';
  @Input() value: string | number;
  @Input() displayValue: string;
  @Input() newValue: string | number;

  @Output() changed: EventEmitter<string | number> = new EventEmitter();
  @ViewChild('inputEl') inputEl: ElementRef;
  @ViewChild('inputElDuration') inputElDuration: ElementRef;

  @HostBinding('class.isFocused') isFocused: boolean = false;

  activeInputEl: HTMLInputElement;

  constructor() {
  }

  ngAfterViewInit() {
    this.activeInputEl = (this.type === 'duration')
      ? this.inputElDuration.nativeElement
      : this.inputEl.nativeElement;
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

  onChange(v: string | number) {
    this.newValue = v;
  }

  keypressHandler(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      this.newValue = null;
      this.activeInputEl.blur();
    }

    if (ev.key === 'Enter') {
      this.activeInputEl.blur();
    }
  }
}
