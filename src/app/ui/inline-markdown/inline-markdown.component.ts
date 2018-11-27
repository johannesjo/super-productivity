import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { fadeAnimation } from '../animations/fade.ani';
import { MarkdownComponent } from 'ngx-markdown';

const HIDE_OVERFLOW_TIMEOUT_DURATION = 300;

@Component({
  selector: 'inline-markdown',
  templateUrl: './inline-markdown.component.html',
  styleUrls: ['./inline-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation]
})
export class InlineMarkdownComponent implements OnInit, OnDestroy {
  @Input() model: string;
  @Input() isLock = false;
  @Output() onChanged: EventEmitter<any> = new EventEmitter();
  @Output() focus: EventEmitter<Event> = new EventEmitter();
  @Output() blur: EventEmitter<Event> = new EventEmitter();
  @ViewChild('wrapperEl') wrapperEl: ElementRef;
  @ViewChild('textareaEl') textareaEl: ElementRef;
  @ViewChild('previewEl') previewEl: MarkdownComponent;

  isHideOverflow = false;
  isShowEdit = false;
  modelCopy: string;
  el: HTMLElement;
  private _hideOverFlowTimeout: number;

  @Input() set isFocus(val: boolean) {
    if (!this.isShowEdit && val) {
      this.toggleShowEdit();
    }
  }

  constructor(
    el: ElementRef,
    private _cd: ChangeDetectorRef,
  ) {
    this.el = el.nativeElement;
    this.resizeParsedToFit();
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

  ngOnDestroy(): void {
    if (this._hideOverFlowTimeout) {
      window.clearTimeout(this._hideOverFlowTimeout);
    }
  }

  keypressHandler(ev: KeyboardEvent) {
    this.resizeTextareaToFit();
    if (ev.keyCode === 10 && ev.ctrlKey) {
      this.untoggleShowEdit();
    }
    console.log(ev.key, ev.ctrlKey);

    if (ev.key === 'Enter' && ev.ctrlKey) {
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
    this._hideOverflow();
    this.textareaEl.nativeElement.style.height = 'auto';
    this.textareaEl.nativeElement.style.height = this.textareaEl.nativeElement.scrollHeight + 'px';
    this.wrapperEl.nativeElement.style.height = this.textareaEl.nativeElement.offsetHeight + 'px';
  }


  resizeParsedToFit() {
    this._hideOverflow();

    setTimeout(() => {
      this.previewEl.element.nativeElement.style.height = 'auto';
      // NOTE: somehow this pixel seem to help
      this.wrapperEl.nativeElement.style.height = this.previewEl.element.nativeElement.offsetHeight + 1 + 'px';
      this.previewEl.element.nativeElement.style.height = '';
    });
  }

  setFocus(ev: Event) {
    this.focus.emit(ev);
  }


  setBlur(ev: Event) {
    this.blur.emit(ev);
  }

  private _hideOverflow() {
    this.isHideOverflow = true;
    if (this._hideOverFlowTimeout) {
      window.clearTimeout(this._hideOverFlowTimeout);
    }

    this._hideOverFlowTimeout = window.setTimeout(() => {
      this.isHideOverflow = false;
      this._cd.detectChanges();
    }, HIDE_OVERFLOW_TIMEOUT_DURATION);
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
