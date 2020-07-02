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
  ViewChild
} from '@angular/core';
import { fadeAnimation } from '../../animations/fade.ani';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, share, switchMap } from 'rxjs/operators';
import { observeWidth } from '../../../util/resize-observer-obs';
import { MainContainerClass } from '../../../app.constants';

const SMALL_CONTAINER_WIDTH = 620;
const VERY_SMALL_CONTAINER_WIDTH = 450;

@Component({
  selector: 'better-drawer-container',
  templateUrl: './better-drawer-container.component.html',
  styleUrls: ['./better-drawer-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation]
})
export class BetterDrawerContainerComponent implements OnInit, AfterContentInit, OnDestroy {
  @Input() sideWidth: number;
  @Output() wasClosed: EventEmitter<void> = new EventEmitter<void>();
  contentEl$: ReplaySubject<HTMLElement> = new ReplaySubject<HTMLElement>(1);
  containerWidth$: Observable<number> = this.contentEl$.pipe(
    filter(el => !!el),
    switchMap((el) => observeWidth(el)),
    distinctUntilChanged(),
    share(),
  );
  isSmallMainContainer$: Observable<boolean> = this.containerWidth$.pipe(
    map(v => v < SMALL_CONTAINER_WIDTH),
    distinctUntilChanged(),
  );
  isVerySmallMainContainer$: Observable<boolean> = this.containerWidth$.pipe(
    map(v => v < VERY_SMALL_CONTAINER_WIDTH),
    distinctUntilChanged(),
  );
  sideStyle: SafeStyle;
  private _subs: Subscription = new Subscription();

  constructor(
    private _elementRef: ElementRef,
    private _domSanitizer: DomSanitizer,
  ) {
  }

  @HostBinding('class.isOpen') get isOpenGet() {
    return this._isOpen;
  }

  @HostBinding('class.isOver') get isOverGet() {
    return this._isOver;
  }

  @ViewChild('contentElRef', {read: ElementRef}) set setContentElRef(ref: ElementRef) {
    if (ref) {
      this.contentEl$.next(ref.nativeElement);
    }
  }

  private _isOpen: boolean;

  @Input() set isOpen(v: boolean) {
    this._isOpen = v;
    this._updateStyle();
  }

  private _isOver: boolean;

  @Input() set isOver(v: boolean) {
    this._isOver = v;
    this._updateStyle();
  }

  ngOnInit(): void {
    this._updateStyle();
  }

  ngAfterContentInit(): void {
    const containerEl = this._elementRef.nativeElement;
    this._subs.add(this.isSmallMainContainer$.subscribe(v => {
      v
        ? containerEl.classList.add(MainContainerClass.isSmallMainContainer)
        : containerEl.classList.remove(MainContainerClass.isSmallMainContainer);
    }));
    this._subs.add(this.isVerySmallMainContainer$.subscribe(v => {
      v
        ? containerEl.classList.add(MainContainerClass.isVerySmallMainContainer)
        : containerEl.classList.remove(MainContainerClass.isVerySmallMainContainer);
    }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  close() {
    this.wasClosed.emit();
  }

  private _updateStyle() {
    const style = (this.isOverGet)
      ? (this.isOpenGet)
        ? 'transform: translateX(-100%);'
        : `transform: translateX(0);`
      : (this.isOpenGet)
        ? 'margin-right: 0;'
        : `margin-right: ${-1 * this.sideWidth}%;`
    ;
    const widthStyle = ` width: ${this.sideWidth}%;`;
    this.sideStyle = this._domSanitizer.bypassSecurityTrustStyle(style + widthStyle);
    // TODO tmp fix, because the line above doesn't seem to work any more
    this.sideStyle = style + widthStyle;
  }
}
