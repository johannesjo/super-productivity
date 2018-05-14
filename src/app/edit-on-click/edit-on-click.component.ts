import { OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { ElementRef } from '@angular/core';
import { Directive } from '@angular/core';
import { OnChanges } from '@angular/core';


// HELPER
// -----------------------------------
function insertAtCursor(el, newText) {
  const sel = window.getSelection();

  const start = sel.anchorOffset;
  const end = sel.focusOffset;
  const text = el.innerText;

  const textBefore = text.substring(0, start);
  const textAfter = text.substring(end, text.length);

  const completeTextAfterInsert = (textBefore + newText + textAfter).trim();

  el.innerText = completeTextAfterInsert;

  // reset caret to proper offset
  const range = document.createRange();
  range.setStart(el.childNodes[0], start + newText.length);
  range.collapse(true);
  const sel2 = window.getSelection();

  sel2.removeAllRanges();
  sel2.addRange(range);
}

function removeTags(str) {
  return str.replace(/<\/?[^`]+?\/?>/gmi, '\n') //replace all tags
    .replace(/\n/gmi, '') // replace line breaks
    .replace(/&nbsp;/gmi, '') // replace line breaks
    .trim();
}

@Directive({
  selector: '[supEditOnClick]',
})
export class EditOnClickComponent implements OnInit, OnChanges {
  @Input() value: string;
  @Input() eventId: string;
  @Output() editFinished: EventEmitter<any> = new EventEmitter();
  lastValue: string;
  isShowEdit: boolean;
  el: HTMLElement;


  constructor(el: ElementRef) {
    this.el = el.nativeElement;
  }

  ngOnInit() {
    const el = this.el;

    if (!(el.getAttribute('contenteditable'))) {
      el.setAttribute('contenteditable', 'true');
    }

    el.addEventListener('input', () => {
      this.setValueFromElement();
    });

    el.addEventListener('blur', (ev) => {
      this.setValueFromElement();
      this.onEditDone(ev);
    });

    // prevent keyboard shortcuts from firing when here
    el.addEventListener('keydown', (ev) => {
      ev.stopPropagation();

      // blur on escape
      if (ev.keyCode === 13 || ev.keyCode === 27) {
        ev.preventDefault();
        setTimeout(() => {
          el.blur();
        });
      }
    });

    // blur on enter
    el.addEventListener('keypress', function (ev) {
      if (ev.keyCode === 13) {
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
      insertAtCursor(el, text);
      this.setValueFromElement();
    };
  }

  ngOnChanges(changes) {
    if (!changes.hasOwnProperty('value')) {
      return false;
    }

    this.lastValue = changes.value.currentValue;

    this.refreshView();
  }

  refreshView() {
    this.el.innerText = this.value;
  }

  onEditDone(event) {
    // deselect all text
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    /* tslint:disable */
    else if (document.selection) {
      document.selection.empty();
    }
    /* tslint:enable */

    const curVal = this.el.innerText;
    const isChanged = (this.lastValue !== curVal);

    if (this.editFinished) {
      this.editFinished.emit({
        isChanged,
        newVal: curVal,
        $taskEl: this.el.closest('.task'),
        event,
      });
    }
    this.lastValue = curVal;
  }

  setValueFromElement() {
    let curVal = this.el.innerText;
    curVal = removeTags(curVal);
    this.value = curVal;
  }

  toggleFromOutside(ev, eventId) {
    if (eventId === this.eventId) {
      setTimeout(() => {
        this.el.focus();
        // select all when doing this
        document.execCommand('selectAll', false, null);
      });
    }
  }
}
