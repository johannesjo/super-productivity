import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

// HELPER
// -----------------------------------

@Directive({
  selector: '[contentEditableOnClick]',
})
export class ContentEditableOnClickDirective implements OnInit, OnDestroy {
  @Input() isResetAfterEdit: boolean = false;
  @Output() editFinished: EventEmitter<{
    isChanged: boolean;
    newVal: string;
    $taskEl: HTMLElement | null;
    event: Event;
  }> = new EventEmitter();
  private _lastDomValue: string | undefined;
  private _lastOutsideVal: string | undefined;
  private readonly _el: HTMLElement;
  private _redrawTimeout: number | undefined;

  constructor(el: ElementRef) {
    this._el = el.nativeElement;
  }

  private _value: string | undefined;

  @Input() set value(_val: string) {
    this._value = this._lastOutsideVal = _val;
    // also update last dom value because that's how check for changes
    this._lastDomValue = _val;
    this._refreshView();
  }

  ngOnInit() {
    const el = this._el;

    if (el.getAttribute('contenteditable') === null) {
      el.setAttribute('contenteditable', 'true');
    }

    // TODO move all ato host listener
    el.addEventListener('focus', (ev: Event) => {
      // setTimeout(() => {
      //   document.execCommand('selectAll', false, null);
      // });
      this._moveCursorToEnd();

      window.clearTimeout(this._redrawTimeout);
      // this fixes the bug where the text is not visible for some time
      // by triggering a redraw via el.offsetHeight
      // this._redrawTimeout = window.setTimeout(() => this._el.offsetHeight, 30);
    });

    el.addEventListener('input', (ev) => {
      this._setValueFromElement();

      // this fixes the bug where the text is not visible for some time
      // by triggering a redraw via el.offsetHeight
      // eslint-disable-next-line
      this._el.offsetHeight;
    });

    el.addEventListener('blur', (ev) => {
      this._setValueFromElement();
      this._onEditDone(ev);
    });

    // prevent keyboard shortcuts from firing when here
    el.addEventListener('keydown', (ev: KeyboardEvent) => {
      ev.stopPropagation();
      // blur on escape
      if (ev.key === 'Enter' || ev.key === 'Escape') {
        ev.preventDefault();
        setTimeout(() => {
          el.blur();
        });
      }
    });

    // blur on enter
    el.addEventListener('keypress', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        // prevent keyboard shortcuts from firing when here
        ev.preventDefault();
        setTimeout(() => {
          el.blur();
        });
      }
    });

    el.onpaste = (ev: ClipboardEvent) => {
      const data = ev.clipboardData !== null && ev.clipboardData.getData('text/plain');
      if (data && data.length) {
        ev.stopPropagation();
        ev.preventDefault();
        const text = data.trim();
        this._insertAtCursor(el, text);
        this._setValueFromElement();
      }
    };
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._redrawTimeout);
  }

  private _refreshView() {
    this._el.innerText = this._value || '';
  }

  private _onEditDone(event: Event) {
    // deselect all text
    const sel = window.getSelection();
    if (sel !== null) {
      sel.removeAllRanges();
    }

    const curVal = this._el.innerText;
    const isChanged = this._lastDomValue !== curVal;
    this._lastDomValue = curVal;

    this.editFinished.emit({
      isChanged,
      newVal: curVal,
      $taskEl: this._el.closest('.task'),
      event,
    });

    if (this.isResetAfterEdit) {
      this._value = this._lastOutsideVal;
      this._refreshView();
    }
  }

  private _setValueFromElement() {
    this._value = this._removeTags(this._el.innerText);
  }

  private _insertAtCursor(el: HTMLElement, newText: string) {
    const sel = window.getSelection();
    if (sel === null) {
      return;
    }

    const start = sel.anchorOffset;
    const end = sel.focusOffset;
    const text = el.innerText;

    const textBefore = text.substring(0, start);
    const textAfter = text.substring(end, text.length);

    el.innerText = (textBefore + newText + textAfter).trim();

    // reset caret to proper offset
    const range = document.createRange();
    range.setStart(el.childNodes[0], start + newText.length);
    range.collapse(true);

    const sel2 = window.getSelection();
    if (sel2 !== null) {
      sel2.removeAllRanges();
      sel2.addRange(range);
    }
  }

  private _removeTags(str: string) {
    return str
      .replace(/<\/?[^`]+?\/?>/gim, '\n') // replace all tags
      .replace(/\n/gim, '') // replace line breaks
      .replace(/&nbsp;/gim, '') // replace line breaks
      .replace('&nbsp;', '') // replace line breaks again because sometimes it doesn't work
      .trim();
  }

  private _moveCursorToEnd() {
    // NOTE: keep in mind that we're in a contenteditable
    try {
      document.execCommand('selectAll', false, undefined);
      const sel = document.getSelection();
      if (sel !== null) {
        sel.collapseToEnd();
      }
    } catch (e) {
      console.error(e);
    }
  }
}
