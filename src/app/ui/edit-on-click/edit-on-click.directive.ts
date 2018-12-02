import { Directive, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';


// HELPER
// -----------------------------------


@Directive({
  selector: '[editOnClick]',
})
export class EditOnClickDirective implements OnInit {
  @Output() editFinished: EventEmitter<any> = new EventEmitter();
  private _lastDomValue: string;
  private readonly _el: HTMLElement;

  @Input() set value(_val) {
    this._value = _val;
    // also update last dom value because that's how check for changes
    this._lastDomValue = _val;
    this._refreshView();
  }

  private _value: string;

  constructor(el: ElementRef) {
    this._el = el.nativeElement;
  }

  ngOnInit() {
    const el = this._el;

    if (!(el.getAttribute('contenteditable'))) {
      el.setAttribute('contenteditable', 'true');
    }

    // TODO move all ato host listener
    el.addEventListener('focus', (ev: Event) => {
      // setTimeout(() => {
      //   document.execCommand('selectAll', false, null);
      // });
    });

    el.addEventListener('input', () => {
      this._setValueFromElement();
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
    el.addEventListener('keypress', function (ev: KeyboardEvent) {
      if (ev.key === 'Enter') {
        // prevent keyboard shortcuts from firing when here
        ev.preventDefault();
        setTimeout(() => {
          el.blur();
        });
      }
    });

    el.onpaste = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const text = ev.clipboardData.getData('text/plain')
        .trim();
      this._insertAtCursor(el, text);
      this._setValueFromElement();
    };
  }


  private _refreshView() {
    this._el.innerText = this._value;
  }

  private _onEditDone(event) {
    // deselect all text
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    const curVal = this._el.innerText;
    const isChanged = (this._lastDomValue !== curVal);
    this._lastDomValue = curVal;

    this.editFinished.emit({
      isChanged,
      newVal: curVal,
      $taskEl: this._el.closest('.task'),
      event,
    });
  }

  private _setValueFromElement() {
    this._value = this._removeTags(this._el.innerText);
  }

  private _insertAtCursor(el, newText) {
    const sel = window.getSelection();

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

    sel2.removeAllRanges();
    sel2.addRange(range);
  }

  private _removeTags(str) {
    return str.replace(/<\/?[^`]+?\/?>/gmi, '\n') // replace all tags
      .replace(/\n/gmi, '') // replace line breaks
      .replace(/&nbsp;/gmi, '') // replace line breaks
      .replace('&nbsp;', '') // replace line breaks again because sometimes it doesn't work
      .trim();
  }
}
