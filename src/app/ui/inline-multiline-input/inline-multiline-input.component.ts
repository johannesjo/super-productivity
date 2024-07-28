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

  // NOTE: we only need this for tasks since, sometimes with the short syntax there are no changes to the title as they are stripped away
  @Input() set resetToInitialValueTrigger(value: unknown) {
    this.tmpValue = this.initialValue;
  }

  @Input() set value(value: string) {
    this.tmpValue = value;
    this.initialValue = value;
    this._setTxtHeight();
    console.log(value);
  }

  initialValue?: string;
  tmpValue?: string;

  @ViewChild('textAreaElement') textarea!: ElementRef<HTMLTextAreaElement>;

  @Output() valueEdited = new EventEmitter<{
    newVal: string;
    wasChanged: boolean;
  }>();

  // @HostBinding('tabindex') tabindex = '1';
  // isEditMode: boolean = false;
  // @HostListener('focus') hostElFocus(): void {
  //   this.isFocused = true;
  //   this.isEditMode = true;
  //   setTimeout(() => {
  //     this.textarea.nativeElement.focus();
  //   });
  // }
  // @HostListener('click') hostElClick(): void {
  //   this.isFocused = true;
  //   this.isEditMode = true;
  //   setTimeout(() => {
  //     this.textarea.nativeElement.focus();
  //   });
  // }

  constructor() {}

  focused(): void {
    this.isFocused = true;
    this._setTxtHeight();
    try {
      window.setTimeout(() => {
        const el = this.textarea.nativeElement;
        el.setSelectionRange(el.value.length, el.value.length);
        el.selectionStart = el.selectionEnd = el.value.length;
      });
    } catch (e) {
      console.warn(e);
    }
  }

  blurred(): void {
    this.isFocused = false;
    // this.isEditMode = false;
    this._submit();
  }

  handleKeyDown(ev: KeyboardEvent): void {
    // prevent keyboard shortcuts from firing
    ev.stopPropagation();
    if (ev.key === 'Escape') {
      this._forceBlur();
    } else if (ev.key === 'Enter') {
      this._forceBlur();
      ev.preventDefault();
    }
  }

  onTextInput(ev: Event): void {
    if ((ev as InputEvent)?.data?.slice(-1) === '\n') {
      console.log('android enter key press');
      this._forceBlur();
      ev.preventDefault();
      setTimeout(() => {
        this._forceBlur();
      });
    }
  }

  onInput(ev: Event): void {
    this._setTxtHeight();
  }

  updateTmpValue(value: string): void {
    this.tmpValue = value;
  }

  private _forceBlur(): void {
    this.textarea.nativeElement.blur();
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
