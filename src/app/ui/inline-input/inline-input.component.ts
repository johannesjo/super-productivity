import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'inline-input',
  templateUrl: './inline-input.component.html',
  styleUrls: ['./inline-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class InlineInputComponent implements AfterViewInit {
  @Input() type: 'text' | 'duration' | 'time' = 'text';
  @Input() value?: string | number;
  @Input() displayValue?: string;
  @Input() newValue?: string | number;

  @Output() changed: EventEmitter<string | number> = new EventEmitter();
  readonly inputEl = viewChild<ElementRef>('inputEl');
  readonly inputElDuration = viewChild<ElementRef>('inputElDuration');

  @HostBinding('class.isFocused') isFocused: boolean = false;

  activeInputEl?: HTMLInputElement;

  constructor() {}

  ngAfterViewInit(): void {
    this.activeInputEl =
      this.type === 'duration'
        ? (this.inputElDuration() as ElementRef).nativeElement
        : (this.inputEl() as ElementRef).nativeElement;
  }

  focusInput(): void {
    this.activeInputEl =
      this.type === 'duration'
        ? (this.inputElDuration() as ElementRef).nativeElement
        : (this.inputEl() as ElementRef).nativeElement;

    this.isFocused = true;
    (this.activeInputEl as HTMLElement).focus();
    if (this.type === 'text' || this.type === 'duration') {
      this.activeInputEl?.select();
    }
  }

  blur(): void {
    this.isFocused = false;

    if (
      (this.newValue || this.newValue === '' || this.newValue === 0) &&
      this.newValue !== this.value
    ) {
      this.changed.emit(this.newValue);
    }
  }

  onChange(v: string | number): void {
    this.newValue = v;
  }

  keypressHandler(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.newValue = undefined;
      (this.activeInputEl as HTMLElement).blur();
    }

    if (ev.key === 'Enter') {
      (this.activeInputEl as HTMLElement).blur();
    }
  }
}
