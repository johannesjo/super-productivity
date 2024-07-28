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

  constructor(private _el: ElementRef) {}

  ngAfterViewInit(): void {
    if (this._el.nativeElement) {
      this._el.nativeElement.querySelector('textarea').focus();
    }
  }

  handleKeyDown(ev: KeyboardEvent): void {
    // prevent keyboard shortcuts from firing when here
    // ev.stopPropagation();

    console.log('KEYDOWN', ev);

    if (ev.key === 'Escape') {
      this._forceBlur();
    } else if (ev.key === 'Enter') {
      this._forceBlur();
      ev.preventDefault();
      this._submit();
    }
  }

  // handleKeyPress(ev: KeyboardEvent): void {
  // console.log('PRESS', ev);
  //
  // // prevent keyboard shortcuts from firing when here
  // if (ev.key === 'Escape') {
  //   this._forceBlur();
  // } else if (ev.key === 'Enter') {
  //   this._forceBlur();
  //   ev.preventDefault();
  //   this._submit();
  // }
  // }

  focused(): void {
    this.isFocused = true;
  }

  blurred(): void {
    this.isFocused = false;
    this._submit();
  }

  onInput(ev: InputEvent): void {
    console.log('INPUT', ev);
    // on mobile android we use this as a workaround for an enter key press
    if (ev.data === null) {
      this._forceBlur();
      this._submit();
    }

    this._setTxtHeight();
  }

  updateTmpValue(value: string): void {
    this.tmpValue = value;
  }

  private _forceBlur(): void {
    this.textarea.nativeElement.blur();
    window.focus();
  }

  private _submit(): void {
    const cleanVal = this._cleanValue(this.tmpValue);
    this.valueEdited.emit({
      newVal: cleanVal,
      wasChanged: cleanVal !== this.initialValue,
    });
    this.tmpValue = cleanVal;
    // android needs the delay for the linebreaks to be removed
    setTimeout(() => {
      this._setTxtHeight();
    });
  }

  private _cleanValue(value: string = ''): string {
    return value.replace(/\r\n|\n|\r/g, '').trim();
  }

  private _setTxtHeight(): void {
    try {
      // reset height
      this.textarea.nativeElement.style.height = 'auto';
      this.textarea.nativeElement.style.height =
        this.textarea.nativeElement.scrollHeight + 'px';
    } catch (e) {
      setTimeout(() => {
        // reset height
        this.textarea.nativeElement.style.height = 'auto';
        this.textarea.nativeElement.style.height =
          this.textarea.nativeElement.scrollHeight + 'px';
      });
    }
  }
}
