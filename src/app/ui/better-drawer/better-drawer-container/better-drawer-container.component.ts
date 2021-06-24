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
import { IS_TOUCH_ONLY } from '../../../util/is-touch';

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

  constructor(private _elementRef: ElementRef, private _domSanitizer: DomSanitizer) {}

  @HostBinding('class.isOpen') get isOpenGet() {
    return this._isOpen;
  }

  @HostBinding('class.isOver') get isOverGet() {
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

  close() {
    // FORCE blur because otherwise task notes won't save
    if (IS_TOUCH_ONLY) {
      document.querySelectorAll('input,textarea').forEach((element) => {
        if (element === document.activeElement) {
          return (element as HTMLElement).blur();
        }
      });
    }
    this.wasClosed.emit();
  }

  private _updateStyle() {
    const widthStyle = ` width: ${this.sideWidth}%;`;
    const style = this.isOverGet
      ? this.isOpenGet
        ? 'transform: translateX(0);'
        : 'transform: translateX(100%);'
      : this.isOpenGet
      ? `margin-right: 0; ${widthStyle}`
      : `margin-right: ${-1 * this.sideWidth}%; ${widthStyle}`;
    this.sideStyle = this._domSanitizer.bypassSecurityTrustStyle(style);
  }
}
