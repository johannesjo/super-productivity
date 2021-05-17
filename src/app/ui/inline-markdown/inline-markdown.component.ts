import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { fadeAnimation } from '../animations/fade.ani';
import { MarkdownComponent } from 'ngx-markdown';
import { IS_ELECTRON } from '../../app.constants';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogFullscreenMarkdownComponent } from '../dialog-fullscreen-markdown/dialog-fullscreen-markdown.component';
import { ElectronService } from '../../core/electron/electron.service';
import { shell } from 'electron';

const HIDE_OVERFLOW_TIMEOUT_DURATION = 300;

@Component({
  selector: 'inline-markdown',
  templateUrl: './inline-markdown.component.html',
  styleUrls: ['./inline-markdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
})
export class InlineMarkdownComponent implements OnInit, OnDestroy {
  @Input() isLock: boolean = false;
  @Input() isShowControls: boolean = false;

  @Output() changed: EventEmitter<string> = new EventEmitter();
  @Output() focused: EventEmitter<Event> = new EventEmitter();
  @Output() blurred: EventEmitter<Event> = new EventEmitter();
  @Output() keyboardUnToggle: EventEmitter<Event> = new EventEmitter();
  @ViewChild('wrapperEl', { static: true }) wrapperEl: ElementRef | undefined;
  @ViewChild('textareaEl') textareaEl: ElementRef | undefined;
  @ViewChild('previewEl') previewEl: MarkdownComponent | undefined;

  isHideOverflow: boolean = false;
  isShowEdit: boolean = false;
  modelCopy: string | undefined;

  isTurnOffMarkdownParsing$: Observable<boolean> = this._globalConfigService.misc$.pipe(
    map((cfg) => cfg.isTurnOffMarkdown),
    startWith(false),
  );
  private _hideOverFlowTimeout: number | undefined;

  constructor(
    private _electronService: ElectronService,
    private _cd: ChangeDetectorRef,
    private _globalConfigService: GlobalConfigService,
    private _matDialog: MatDialog,
  ) {
    this.resizeParsedToFit();
  }

  @HostBinding('class.isFocused') get isFocused() {
    return this.isShowEdit;
  }

  private _model: string | undefined;

  get model() {
    return this._model;
  }

  @Input() set model(v: string | undefined) {
    this._model = v;
    this.modelCopy = v;

    if (!this.isShowEdit) {
      window.setTimeout(() => {
        this.resizeParsedToFit();
      });
    }
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

    if ((ev.key === 'Enter' && ev.ctrlKey) || ev.code === 'Escape') {
      this.untoggleShowEdit();
      this.keyboardUnToggle.emit(ev);
    }
  }

  toggleShowEdit($event?: MouseEvent) {
    // check if anchor link was clicked
    if (!$event || ($event.target as HTMLElement).tagName !== 'A') {
      this.isShowEdit = true;
      this.modelCopy = this.model || '';

      setTimeout(() => {
        if (!this.textareaEl) {
          throw new Error('Textarea not visible');
        }
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
    if (!this.textareaEl) {
      throw new Error('Textarea not visible');
    }
    this.modelCopy = this.textareaEl.nativeElement.value;

    if (this.modelCopy !== this.model) {
      this.model = this.modelCopy;
      this.changed.emit(this.modelCopy);
    }
  }

  resizeTextareaToFit() {
    this._hideOverflow();
    if (!this.textareaEl) {
      throw new Error('Textarea not visible');
    }
    if (!this.wrapperEl) {
      throw new Error('Wrapper el not visible');
    }
    this.textareaEl.nativeElement.style.height = 'auto';
    this.textareaEl.nativeElement.style.height =
      this.textareaEl.nativeElement.scrollHeight + 'px';
    this.wrapperEl.nativeElement.style.height =
      this.textareaEl.nativeElement.offsetHeight + 'px';
  }

  openFullScreen() {
    this._matDialog
      .open(DialogFullscreenMarkdownComponent, {
        minWidth: '100vw',
        height: '100vh',
        restoreFocus: true,
        data: {
          content: this.modelCopy,
        },
      })
      .afterClosed()
      .subscribe((res) => {
        if (typeof res === 'string') {
          this.modelCopy = res;
          this.changed.emit(res);
        }
      });
  }

  resizeParsedToFit() {
    this._hideOverflow();

    setTimeout(() => {
      if (!this.previewEl) {
        if (this.textareaEl) {
          this.resizeTextareaToFit();
        }
        return;
      }
      if (!this.wrapperEl) {
        throw new Error('Wrapper el not visible');
      }
      this.previewEl.element.nativeElement.style.height = 'auto';
      // NOTE: somehow this pixel seem to help
      this.wrapperEl.nativeElement.style.height =
        this.previewEl.element.nativeElement.offsetHeight + 'px';
      this.previewEl.element.nativeElement.style.height = '';
    });
  }

  setFocus(ev: Event) {
    this.focused.emit(ev);
  }

  setBlur(ev: Event) {
    this.blurred.emit(ev);
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
    if (!this.wrapperEl) {
      throw new Error('Wrapper el not visible');
    }
    this.wrapperEl.nativeElement.addEventListener('click', (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (target.tagName && target.tagName.toLowerCase() === 'a') {
        const href = target.getAttribute('href');
        if (href !== null) {
          ev.preventDefault();
          (this._electronService.shell as typeof shell).openExternal(href);
        }
      }
    });
  }
}
