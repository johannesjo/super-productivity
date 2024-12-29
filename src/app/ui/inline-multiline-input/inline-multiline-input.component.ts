import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  viewChild,
  output,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'inline-multiline-input',
  imports: [ReactiveFormsModule, FormsModule, TranslateModule],
  templateUrl: './inline-multiline-input.component.html',
  styleUrl: './inline-multiline-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineMultilineInputComponent {
  T: typeof T = T;
  @HostBinding('class.is-focused') isFocused = false;

  // NOTE: we only need this for tasks since, sometimes with the short syntax there are no changes to the title as they are stripped away
  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set resetToLastExternalValueTrigger(value: unknown) {
    // console.log({
    //   tmp: this.tmpValue,
    //   last: this.lastExternalValue,
    // });
    // never update while editing
    if (!this.isFocused && this.tmpValue !== this.lastExternalValue) {
      // NOTE: this works because set value is called after this, for non-short syntax only changes
      this.tmpValue = this.lastExternalValue;
      console.log('new tmp', this.tmpValue);
    }
  }

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set value(value: string) {
    this.tmpValue = value;
    this.lastExternalValue = value;
    this._setTxtHeight();
    // console.log('setValue', value);
  }

  lastExternalValue?: string;
  tmpValue?: string;

  readonly textarea =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('textAreaElement');

  readonly valueEdited = output<{
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
        const el = this.textarea().nativeElement;
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
    this.textarea().nativeElement.blur();
  }

  private _submit(): void {
    const cleanVal = this._cleanValue(this.tmpValue);
    this.valueEdited.emit({
      newVal: cleanVal,
      wasChanged: cleanVal !== this.lastExternalValue,
    });
    // console.log(
    //   'submit',
    //   this.tmpValue,
    //   'wasChanged',
    //   cleanVal !== this.lastExternalValue,
    // );

    // android needs the delay for the linebreaks to be removed
    setTimeout(() => {
      this._setTxtHeight();
    });
  }

  private _cleanValue(value: string = ''): string {
    return value?.replace(/\r\n|\n|\r/g, '').trim();
  }

  private _setTxtHeight(): void {
    try {
      // reset height
      const textarea = this.textarea();
      textarea.nativeElement.style.height = 'auto';
      textarea.nativeElement.style.height = textarea.nativeElement.scrollHeight + 'px';
    } catch (e) {
      setTimeout(() => {
        // reset height
        const textarea = this.textarea();
        textarea.nativeElement.style.height = 'auto';
        textarea.nativeElement.style.height = textarea.nativeElement.scrollHeight + 'px';
      });
    }
  }
}
