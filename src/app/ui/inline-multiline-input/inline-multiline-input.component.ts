import {
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
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'inline-multiline-input',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, TranslateModule],
  templateUrl: './inline-multiline-input.component.html',
  styleUrl: './inline-multiline-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineMultilineInputComponent {
  T: typeof T = T;
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

  // isEditMode: boolean = false;
  // @HostListener('focus') hostElFocus(): void {
  //   this.isFocused = true;
  //   this.isEditMode = true;
  // }
  // @HostListener('click') hostElClick(): void {
  //   this.isFocused = true;
  //   this.isEditMode = true;
  // }

  constructor() {}

  handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this._forceBlur();
    } else if (ev.key === 'Enter') {
      this._forceBlur();
      ev.preventDefault();
      this._submit();
    }
  }

  focused(): void {
    this.isFocused = true;
    this._setTxtHeight();
  }

  blurred(): void {
    this.isFocused = false;
    this._submit();
  }

  onInput(ev: Event): void {
    // on mobile android we use this as a workaround for an enter key press
    if ((ev as InputEvent)?.data === null) {
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
