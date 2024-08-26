import {
  AfterContentInit,
  ChangeDetectionStrategy,
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
import { fadeAnimation } from '../../animations/fade.ani';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { distinctUntilChanged, map, share, switchMap } from 'rxjs/operators';
import { observeWidth } from '../../../util/resize-observer-obs';
import { MainContainerClass } from '../../../app.constants';
import { LanguageService } from '../../../core/language/language.service';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';

const SMALL_CONTAINER_WIDTH = 620;
const VERY_SMALL_CONTAINER_WIDTH = 450;

@Component({
  selector: 'better-drawer-container',
  templateUrl: './better-drawer-container.component.html',
  styleUrls: ['./better-drawer-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
})
export class BetterDrawerContainerComponent
  implements OnInit, AfterContentInit, OnDestroy
{
  @Input() sideWidth: number = 0;
  @Output() wasClosed: EventEmitter<void> = new EventEmitter<void>();
  contentEl$: ReplaySubject<HTMLElement> = new ReplaySubject<HTMLElement>(1);
  containerWidth$: Observable<number> = this.contentEl$.pipe(
    switchMap((el) => observeWidth(el)),
    distinctUntilChanged(),
    share(),
  );
  isSmallMainContainer$: Observable<boolean> = this.containerWidth$.pipe(
    map((v) => v < SMALL_CONTAINER_WIDTH),
    distinctUntilChanged(),
  );
  isVerySmallMainContainer$: Observable<boolean> = this.containerWidth$.pipe(
    map((v) => v < VERY_SMALL_CONTAINER_WIDTH),
    distinctUntilChanged(),
  );
  sideStyle: SafeStyle = '';
  private _subs: Subscription = new Subscription();

  constructor(
    private _elementRef: ElementRef,
    private _domSanitizer: DomSanitizer,
    private _languageService: LanguageService,
  ) {
    this._subs = this._languageService.isLangRTL.subscribe((val) => {
      this.isRTL = val;
    });
  }

  @HostBinding('class.isOpen') get isOpenGet(): boolean {
    return this._isOpen;
  }

  @HostBinding('class.isOver') get isOverGet(): boolean {
    return this._isOver;
  }

  @ViewChild('contentElRef', { read: ElementRef }) set setContentElRef(ref: ElementRef) {
    this.contentEl$.next(ref.nativeElement);
  }

  private _isOpen: boolean = false;

  @Input() set isOpen(v: boolean) {
    this._isOpen = v;
    this._updateStyle();
  }

  private _isOver: boolean = false;

  @Input() set isOver(v: boolean) {
    this._isOver = v;
    this._updateStyle();
  }

  ngOnInit(): void {
    this._updateStyle();
  }

  ngAfterContentInit(): void {
    const containerEl = this._elementRef.nativeElement;
    this._subs.add(
      this.isSmallMainContainer$.subscribe((v) => {
        if (v) {
          containerEl.classList.add(MainContainerClass.isSmallMainContainer);
        } else {
          containerEl.classList.remove(MainContainerClass.isSmallMainContainer);
        }
      }),
    );
    this._subs.add(
      this.isVerySmallMainContainer$.subscribe((v) => {
        if (v) {
          containerEl.classList.add(MainContainerClass.isVerySmallMainContainer);
        } else {
          containerEl.classList.remove(MainContainerClass.isVerySmallMainContainer);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  updateStyleAfterTransition(): void {
    if (!this.isOverGet && !this.isOpenGet) {
      this.sideStyle = this._domSanitizer.bypassSecurityTrustStyle(
        this._getWidthRelatedStyles() + ' visibility: hidden;',
      );
    }
  }

  close(): void {
    // FORCE blur because otherwise task notes won't save
    if (IS_TOUCH_PRIMARY) {
      document.querySelectorAll('input,textarea').forEach((element) => {
        if (element === document.activeElement) {
          return (element as HTMLElement).blur();
        }
      });
    }
    this.wasClosed.emit();
  }

  isRTL: boolean = false;

  private _getWidthRelatedStyles(): string {
    const widthStyle = ` width: ${this.sideWidth}%;`,
      margin = this.isRTL ? 'margin-left' : 'margin-right';

    return this.isOverGet
      ? this.isOpenGet
        ? 'transform: translateX(0);'
        : 'transform: translateX(100%);'
      : this.isOpenGet
        ? `${margin}: 0; ${widthStyle}`
        : `${margin}: ${-1 * this.sideWidth}%; ${widthStyle}`;
  }

  private _updateStyle(): void {
    this.sideStyle = this._domSanitizer.bypassSecurityTrustStyle(
      this._getWidthRelatedStyles(),
    );
  }
}
