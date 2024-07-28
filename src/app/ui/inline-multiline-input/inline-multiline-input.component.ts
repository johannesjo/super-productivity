import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'inline-multiline-input',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './inline-multiline-input.component.html',
  styleUrl: './inline-multiline-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineMultilineInputComponent implements AfterViewInit {
  @HostBinding('class.is-focused') isFocused = false;

  @Input() set value(value: string) {
    this.tmpValue = value;
    this.initialValue = value;
    this._setTxtHeight();
  }

  initialValue?: string;
  tmpValue?: string;

  @ViewChild('textAreaElement') textarea!: ElementRef<HTMLTextAreaElement>;

  @Output() valueEdited = new EventEmitter<{
    newVal: string;
    wasChanged: boolean;
  }>();
  @Output() cancel: EventEmitter<void> = new EventEmitter<void>();

  constructor(private _el: ElementRef) {}

  ngAfterViewInit(): void {
    if (this._el.nativeElement) {
      this._el.nativeElement.querySelector('textarea').focus();
    }
  }

  handleKeyDown(ev: KeyboardEvent): void {
    // prevent keyboard shortcuts from firing when here
    ev.stopPropagation();

    if (ev.key === 'Escape') {
      this.cancel.emit();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this._submit();
    }
  }

  focused(): void {
    this.isFocused = true;
  }

  blurred(): void {
    this.isFocused = false;
    this._submit();
  }

  onInput(ev: Event): void {
    this._setTxtHeight();
  }

  updateTmpValue(value: string): void {
    this.tmpValue = value;
  }

  private _submit(): void {
    const cleanVal = this._cleanValue(this.tmpValue);
    this.valueEdited.emit({
      newVal: cleanVal,
      wasChanged: cleanVal !== this.initialValue,
    });
  }

  private _cleanValue(value: string = ''): string {
    return value.replace(/\r\n|\n|\r/g, '').trim();
  }

  private _setTxtHeight(): void {
    try {
      this.textarea.nativeElement.style.height =
        this.textarea.nativeElement.scrollHeight + 'px';
    } catch (e) {
      setTimeout(() => {
        this.textarea.nativeElement.style.height =
          this.textarea.nativeElement.scrollHeight + 'px';
      });
    }
  }
}
