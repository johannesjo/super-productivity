import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { fadeAnimation } from '../animations/fade.ani';
import { MarkdownComponent } from 'ngx-markdown';


@Component({
  selector: 'inline-markdown',
  templateUrl: './inline-markdown.component.html',
  styleUrls: ['./inline-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation]
})
export class InlineMarkdownComponent implements OnInit {
  @Input() model: string;
  @Input() isLock = false;
  @Output() onChanged: EventEmitter<any> = new EventEmitter();
  @Output() focus: EventEmitter<Event> = new EventEmitter();
  @Output() blur: EventEmitter<Event> = new EventEmitter();
  @ViewChild('wrapperEl') wrapperEl: ElementRef;
  @ViewChild('textareaEl') textareaEl: ElementRef;
  @ViewChild('previewEl') previewEl: MarkdownComponent;

  isShowEdit = false;
  modelCopy: string;
  el: HTMLElement;

  @Input() set isFocus(val: boolean) {
    if (!this.isShowEdit && val) {
      this.toggleShowEdit();
    }
  }

  constructor(el: ElementRef) {
    this.el = el.nativeElement;
  }

  ngOnInit() {
    if (this.isLock) {
      this.toggleShowEdit();
    } else {
      this.resizeParsedToFit();
    }
    // if (IS_ELECTRON) {
    //   waitForMarkedTimeOut = $timeout(() => {
    //     makeLinksWorkForElectron();
    //   });
    // }
  }

  keypressHandler($event) {
    if ($event.keyCode === 10 && $event.ctrlKey) {
      this.untoggleShowEdit();
    }
  }

  toggleShowEdit($event?) {
    // check if anchor link was clicked
    if (!$event || $event.target.tagName !== 'A') {
      this.isShowEdit = true;
      this.modelCopy = this.model || '';

      setTimeout(() => {
        this.textareaEl.nativeElement.value = this.modelCopy;
        this.textareaEl.nativeElement.focus();
        this.resizeTextareaToFit();
      });
    }
  }

  untoggleShowEdit() {
    // makeLinksWorkForElectron();
    if (!this.isLock) {
      this.resizeParsedToFit();
      this.isShowEdit = false;
    }
    this.modelCopy = this.textareaEl.nativeElement.value;

    if (this.modelCopy !== this.model) {
      this.model = this.modelCopy;
      // TODO refactor this!!
      this.onChanged.emit({newVal: this.modelCopy});
    }
  }


  resizeTextareaToFit() {
    this.textareaEl.nativeElement.style.height = 'auto';
    this.textareaEl.nativeElement.style.height = this.textareaEl.nativeElement.scrollHeight + 'px';
    this.wrapperEl.nativeElement.style.height = this.textareaEl.nativeElement.offsetHeight + 'px';
  }


  resizeParsedToFit() {
    setTimeout(() => {
      this.previewEl.element.nativeElement.style.height = 'auto';
      this.wrapperEl.nativeElement.style.height = this.previewEl.element.nativeElement.offsetHeight + 'px';
      this.previewEl.element.nativeElement.style.height = '';
    });
  }

  setFocus(ev: Event) {
    this.focus.emit(ev);
  }


  setBlur(ev: Event) {
    this.blur.emit(ev);
  }

  // function makeLinksWorkForElectron() {
  //   if (IS_ELECTRON) {
  //     const shell = require('electron').shell;
  //     const links = $element.find('a');
  //
  //     links.on('click', (event) => {
  //       let url = angular.element(event.target).attr('href');
  //
  //       if (!/^https?:\/\//i.test(url)) {
  //         url = 'http://' + url;
  //       }
  //       event.preventDefault();
  //       shell.openExternal(url);
  //     });
  //   }
  // }
}
