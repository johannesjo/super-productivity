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
import { IS_ELECTRON } from '../../app.constants';
import { ElectronService } from 'ngx-electron';

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
  @Output() changed: EventEmitter<any> = new EventEmitter();
  @Output() focus: EventEmitter<Event> = new EventEmitter();
  @Output() blur: EventEmitter<Event> = new EventEmitter();
  @ViewChild('wrapperEl') wrapperEl: ElementRef;
  @ViewChild('textareaEl') textareaEl: ElementRef;
  @ViewChild('previewEl') previewEl: MarkdownComponent;

  isHideOverflow = false;
  isShowEdit = false;
  modelCopy: string;
  private _hideOverFlowTimeout: number;

  constructor(
    private _electronService: ElectronService,
    private _cd: ChangeDetectorRef,
  ) {
    this.resizeParsedToFit();
  }

  @Input() set isFocus(val: boolean) {
    if (!this.isShowEdit && val) {
      this.toggleShowEdit();
    }
  }

  ngOnInit() {
    if (this.isLock) {
      this.toggleShowEdit();
    } else {
      this.resizeParsedToFit();
    }
    if (IS_ELECTRON) {
      this._makeLinksWorkForElectron();
    }
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
    if (!this.isLock) {
      this.resizeParsedToFit();
      this.isShowEdit = false;
    }
    this.modelCopy = this.textareaEl.nativeElement.value;

    if (this.modelCopy !== this.model) {
      this.model = this.modelCopy;
      this.changed.emit(this.modelCopy);
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

  private _makeLinksWorkForElectron() {
    const shell = this._electronService.shell;
    this.wrapperEl.nativeElement.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      if (target.tagName && target.tagName.toLowerCase() === 'a') {
        const href = target.getAttribute('href');
        if (href) {
          ev.preventDefault();
          shell.openExternal(href);
        }
      }
    });
  }
}
