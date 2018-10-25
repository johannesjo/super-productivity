import { Directive, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';


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
  selector: '[editOnClick]',
})
export class EditOnClickDirective implements OnInit, OnChanges {
  @Input() value: string;
  @Input() eventId: string;
  @Output() editFinished: EventEmitter<any> = new EventEmitter();
  lastValue: string;
  el: HTMLElement;


  constructor(el: ElementRef) {
    this.el = el.nativeElement;
  }

  ngOnInit() {
    const el = this.el;

    if (!(el.getAttribute('contenteditable'))) {
      el.setAttribute('contenteditable', 'true');
    }

    el.addEventListener('focus', (ev: Event) => {
      // setTimeout(() => {
      //   document.execCommand('selectAll', false, null);
      // });
    });

    el.addEventListener('input', () => {
      this.setValueFromElement();
    });

    el.addEventListener('blur', (ev) => {
      this.setValueFromElement();
      this.onEditDone(ev);
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
}
