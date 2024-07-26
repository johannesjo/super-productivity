import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { IS_FIREFOX } from '../../util/is-firefox';
import { devError } from '../../util/dev-error';
import { IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';

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

  ngOnInit(): void {
    const el = this._el;

    if (el.getAttribute('contenteditable') === null) {
      el.setAttribute('contenteditable', 'true');
    }

    // TODO move all ato host listener
    el.addEventListener('focus', (ev: Event) => {
      // setTimeout(() => {
      //   document.execCommand('selectAll', false, null);
      // });
      this._moveCursorToEndForKeyboardFocus();

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

    el.addEventListener('keydown', (ev: KeyboardEvent) => {
      // prevent keyboard shortcuts from firing when here
      ev.stopPropagation();
      // blur on escape
      if (ev.key === 'Enter' || ev.key === 'Escape') {
        ev.preventDefault();
        setTimeout(() => {
          el.blur();
        });
      }
    });

    if (IS_TOUCH_PRIMARY) {
      el.addEventListener('textInput', (ev: any) => {
        console.log(ev);
        ev.preventDefault();
        // const androidCode = (ev as any)?.originalEvent?.data.charCodeAt(0);
        const androidCode = ev?.originalEvent?.data.charCodeAt(0);
        console.log(androidCode);
        setTimeout(() => {
          el.blur();
        });
      });
    }

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
        // NOTE: we replace all linebreaks since they are not supported for tasks and cause text selection issues
        const text = data.split('\n').join(' ').trim();
        this._insertAtCursor(el, text);
        this._setValueFromElement();
      }
    };
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._redrawTimeout);
  }

  private _refreshView(): void {
    this._el.innerText = this._value || '';
  }

  private _onEditDone(event: Event): void {
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

  private _setValueFromElement(): void {
    this._value = this._removeTagsAndCleanStr(this._el.innerText);
  }

  private _insertAtCursor(el: HTMLElement, newText: string): void {
    const sel = window.getSelection();
    if (sel === null) {
      return;
    }

    if (IS_FIREFOX) {
      this._insertAtCursorFirefox(sel, el, newText);
    } else {
      this._insertAtCursorChromium(sel, el, newText);
    }
  }

  /**
   * Function that insert the pasted text in the correct point of the HTML element.
   * For Firefox.
   */
  private _insertAtCursorFirefox(sel: Selection, el: HTMLElement, newText: string): void {
    let start = sel.anchorOffset;
    let end = sel.focusOffset;
    const text = el.innerText;
    let indexNode = 0; // the childNode index

    // sometimes, the selected node is not the first one, and the new text will add in the wrong place.
    // so, it is needed to check what is the correct selected node before doing the rest of the code
    if (el.childNodes.length > 1) {
      let untilNode = 0;
      el.childNodes.forEach((item, index) => {
        if (!sel.anchorNode?.isSameNode(item)) {
          untilNode += item.nodeValue ? item.nodeValue.length : untilNode;
        } else {
          if (index !== 0) {
            start = start + untilNode;
            end = end + untilNode;
            indexNode = index;
          }
        }
      });
    }
    if (start > text.length) {
      start = text.length;
    }
    if (end > text.length) {
      end = text.length;
    }
    const textBefore = text.substring(0, start);
    const textAfter = text.substring(end, text.length);

    // reset caret to proper offset
    const range = document.createRange();
    el.innerText = (textBefore + newText + textAfter).trim();
    range.setStartAfter(el.childNodes[indexNode]);

    range.collapse(true);

    const sel2 = window.getSelection();
    if (sel2 !== null) {
      sel2.removeAllRanges();
      sel2.addRange(range);
    }
  }

  /**
   * Function that insert the pasted text in the correct point of the HTML Element.
   * For Chrome.
   * */
  private _insertAtCursorChromium(
    sel: Selection,
    el: HTMLElement,
    newText: string,
  ): void {
    const start = sel.anchorOffset;
    const end = sel.focusOffset;
    const text = el.innerText;

    const textBefore = text.substring(0, start);
    const textAfter = text.substring(end, text.length);

    el.innerText = (textBefore + newText + textAfter).trim();

    // reset caret to proper offset
    const range = document.createRange();
    console.log(el.childNodes[0], start, newText.length);
    console.log(el.childNodes, start, newText.length, newText, start + newText.length);

    // TODO find the real cause of this failing
    try {
      range.setStart(el.childNodes[0], start + newText.length);
    } catch (e) {
      console.error(e);
      console.log(el.childNodes[0].textContent?.length);
      range.setStart(el.childNodes[0], el.childNodes[0].textContent?.length || 0);
    }
    range.collapse(true);

    const sel2 = window.getSelection();
    if (sel2 !== null) {
      sel2.removeAllRanges();
      sel2.addRange(range);
    }
  }

  private _removeTagsAndCleanStr(str: string): string {
    return str
      .replace(/<\/?[^>]+(>|$)/g, '') // remove all HTML tags
      .replace(/\r?\n|\r/g, '') // remove all types of line breaks
      .replace(/&nbsp;/gi, ' ') // replace non-breaking spaces with regular spaces
      .replace('&nbsp;', '') // replace line breaks again because sometimes it doesn't work
      .replace(/\s\s+/g, ' ') // replace multiple spaces with a single space
      .trim(); // trim leading and trailing spaces
  }

  private _moveCursorToEndForKeyboardFocus(): void {
    // NOTE: keep in mind that we're in a contenteditable
    try {
      const sel = document.getSelection();
      if (sel !== null) {
        // only execute for focus via keyboard
        if (sel.focusNode) {
          try {
            document.execCommand('selectAll', false, undefined);
            // NOTE: might not work on android
            sel.collapseToEnd();
          } catch (e) {
            devError(e);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}
