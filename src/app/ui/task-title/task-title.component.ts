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
  selector: 'task-title',
  imports: [ReactiveFormsModule, FormsModule, TranslateModule],
  templateUrl: './task-title.component.html',
  styleUrl: './task-title.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTitleComponent {
  T: typeof T = T;
  @HostBinding('class.is-focused') isFocused = false;

  // NOTE: we only need this for tasks since, sometimes with the short syntax there are no changes to the title as they are stripped away
  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set resetToLastExternalValueTrigger(value: unknown) {
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
  }

  lastExternalValue?: string;
  tmpValue?: string;

  readonly textarea =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('textAreaElement');

  readonly valueEdited = output<{
    newVal: string;
    wasChanged: boolean;
  }>();

  constructor() {}

  focused(): void {
    this.isFocused = true;
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
  }

  private _cleanValue(value: string = ''): string {
    return value?.replace(/\r\n|\n|\r/g, '').trim();
  }
}
