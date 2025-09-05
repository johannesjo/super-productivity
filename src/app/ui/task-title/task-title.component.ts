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
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { Log } from '../../core/log';

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
      Log.log('new tmp', this.tmpValue);
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
    blurEvent?: FocusEvent;
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
      Log.err(e);
    }
  }

  blurred(event?: FocusEvent): void {
    this.isFocused = false;
    // this.isEditMode = false;
    this._submit(event);
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
    // TODO not really clear if this is needed. was apparently added to prevent the android web view enter key from submitting
    if (IS_ANDROID_WEB_VIEW && (ev as InputEvent)?.data?.slice(-1) === '\n') {
      Log.log('android enter key press');
      this._forceBlur();
      ev.preventDefault();
      setTimeout(() => {
        this._forceBlur();
      });
    }
  }

  updateTmpValue(value: string): void {
    this.tmpValue = this._cleanValue(value);
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text/plain') || '';
    const cleaned = this._cleanValue(pastedText);

    const textarea = this.textarea().nativeElement;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    const currentVal = textarea.value;
    const newVal = currentVal.slice(0, start) + cleaned + currentVal.slice(end);

    // Update both textarea and tmpValue
    textarea.value = newVal;
    this.tmpValue = newVal;
    this.updateTmpValue(newVal);

    // Reset cursor position
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + cleaned.length;
    });
  }

  private _forceBlur(): void {
    this.textarea().nativeElement.blur();
  }

  private _submit(blurEvent?: FocusEvent): void {
    const cleanVal = this._cleanValue(this.tmpValue);
    this.valueEdited.emit({
      newVal: cleanVal,
      wasChanged: cleanVal !== this.lastExternalValue,
      blurEvent,
    });
  }

  private _cleanValue(value: string = ''): string {
    return value?.replace(/\n|\r/g, '').trim();
  }
}
