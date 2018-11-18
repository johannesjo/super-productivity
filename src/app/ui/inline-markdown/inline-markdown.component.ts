import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';


@Component({
  selector: 'inline-markdown',
  templateUrl: './inline-markdown.component.html',
  styleUrls: ['./inline-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineMarkdownComponent implements OnInit {
  @Input() model: string;
  @Input() isLock = false;
  @Output() onChanged: EventEmitter<any> = new EventEmitter();
  isShowEdit = false;
  modelCopy: string;
  el: HTMLElement;
  textareaEl: HTMLTextAreaElement;

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
        const textareaEls = this.el.querySelectorAll('textarea');
        this.textareaEl = textareaEls[0];

        this.textareaEl.value = this.modelCopy;
        this.textareaEl.focus();
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
    this.modelCopy = this.textareaEl.value;

    if (this.modelCopy !== this.model) {
      this.model = this.modelCopy;
      // TODO refactor this!!
      this.onChanged.emit({newVal: this.modelCopy});
    }
  }


  resizeTextareaToFit() {
    const wrapperEl: HTMLElement = this.el.querySelectorAll('div')[0];
    this.textareaEl.style.height = 'auto';
    this.textareaEl.style.height = this.textareaEl.scrollHeight + 'px';
    wrapperEl.style.height = this.textareaEl.offsetHeight + 'px';
  }


  resizeParsedToFit() {
    setTimeout(() => {
      const previewEl: any = this.el.querySelectorAll('.markdown-parsed')[0];
      const wrapperEl: HTMLElement = this.el.querySelectorAll('div')[0];

      previewEl.style.height = 'auto';
      wrapperEl.style.height = previewEl.offsetHeight + 'px';
      previewEl.style.height = '';
    });
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
