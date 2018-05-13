import { Component, OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'sup-inline-markdown',
  templateUrl: './inline-markdown.component.html',
  styleUrls: ['./inline-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineMarkdownComponent implements OnInit {
  @Input() model: string;
  @Output() onChanged: EventEmitter<any> = new EventEmitter();
  isShowEdit: boolean = false;
  modelCopy: string;
  el: HTMLElement;
  textareaEl: HTMLTextAreaElement;

  constructor(el: ElementRef) {
    this.el = el.nativeElement;
  }

  ngOnInit() {
    this.resizeToFit();
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
  };

  toggleShowEdit($event) {
    // check if anchor link was clicked
    if ($event.target.tagName !== 'A') {
      this.isShowEdit = true;
      this.modelCopy = this.model || '';

      setTimeout(() => {
        const textareaEls = this.el.querySelectorAll('textarea');
        this.textareaEl = textareaEls[0];

        this.textareaEl.value = this.modelCopy;
        this.textareaEl.focus();
      });
    }
  }

  untoggleShowEdit() {
    this.modelCopy = this.textareaEl.value;
    this.isShowEdit = false;
    // makeLinksWorkForElectron();
    this.resizeToFit();

    if (this.modelCopy !== this.model) {
      this.model = this.modelCopy;
      this.onChanged.emit({newVal: this.modelCopy});
    }
  }


  resizeToFit() {
    setTimeout(() => {
      const previewEl: any = this.el.querySelectorAll('markdown-to-html')[0];
      const wrapperEl: HTMLElement = this.el.querySelectorAll('div')[0];

      previewEl.style.height = 'auto';
      wrapperEl.style.height = previewEl.offsetHeight + 'px';
      previewEl.style.height = '';
    });
  };


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
