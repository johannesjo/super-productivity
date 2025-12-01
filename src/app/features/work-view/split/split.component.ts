import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  input,
  output,
  Renderer2,
  viewChild,
} from '@angular/core';
import { animationFrameScheduler, fromEvent, Subscription } from 'rxjs';
import { observeOn, takeUntil } from 'rxjs/operators';
import { isTouchOnly } from '../../../util/is-touch-only';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

const ANIMATABLE_CLASS = 'isAnimatable';

@Component({
  selector: 'split',
  templateUrl: './split.component.html',
  styleUrls: ['./split.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFabButton, MatIcon],
})
export class SplitComponent implements AfterViewInit {
  private _renderer = inject(Renderer2);

  readonly splitTopEl = input<ElementRef>();
  readonly splitBottomEl = input<ElementRef>();
  readonly containerEl = input<HTMLElement>();
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() counter?: number;
  readonly isAnimateBtn = input<boolean>();
  readonly posChanged = output<number>();

  pos: number = 100;
  eventSubs?: Subscription;
  readonly buttonEl = viewChild<ElementRef>('buttonEl');
  private _isDrag: boolean = false;
  private _isViewInitialized: boolean = false;

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set splitPos(pos: number) {
    if (pos !== this.pos) {
      this._updatePos(pos, true);

      if (this._isViewInitialized) {
        this._renderer.addClass(this.splitTopEl(), ANIMATABLE_CLASS);
        this._renderer.addClass(this.splitBottomEl(), ANIMATABLE_CLASS);
      }
    }
  }

  ngAfterViewInit(): void {
    this._isViewInitialized = true;
    this._updatePos(this.pos, false);
    this._renderer.addClass(this.splitTopEl(), ANIMATABLE_CLASS);
    this._renderer.addClass(this.splitBottomEl(), ANIMATABLE_CLASS);
  }

  toggle(): void {
    this._renderer.addClass(this.splitTopEl(), ANIMATABLE_CLASS);
    this._renderer.addClass(this.splitBottomEl(), ANIMATABLE_CLASS);
    let newPos = 50;
    if (this.pos > 45 && this.pos < 55) {
      newPos = 100;
    }
    this._updatePos(newPos);
  }

  onTouchStart(): void {
    this._isDrag = false;
    const touchend$ = fromEvent(document, 'touchend');
    this.eventSubs = touchend$.subscribe(() => this.onMoveEnd());

    const touchmove$ = fromEvent(document, 'touchmove')
      .pipe(
        takeUntil(touchend$),
        // Run drag calculations at most once per frame to avoid layout thrash.
        observeOn(animationFrameScheduler),
      )
      .subscribe((e: Event) => this.onMove(e as TouchEvent));

    this.eventSubs.add(touchmove$);
  }

  onMouseDown(): void {
    this._isDrag = false;
    const mouseup$ = fromEvent(document, 'mouseup');
    this.eventSubs = mouseup$.subscribe(() => this.onMoveEnd());

    const mousemove$ = fromEvent(document, 'mousemove')
      .pipe(
        takeUntil(mouseup$),
        // Run drag calculations at most once per frame to avoid layout thrash.
        observeOn(animationFrameScheduler),
      )
      .subscribe((e: Event) => this.onMove(e as MouseEvent));

    this.eventSubs.add(mousemove$);
  }

  onMoveEnd(): void {
    if (this.eventSubs) {
      this.eventSubs.unsubscribe();
      this.eventSubs = undefined;
    }

    if (!this._isDrag) {
      this.toggle();
    }
  }

  onMove(ev: TouchEvent | MouseEvent): void {
    const containerEl = this.containerEl();
    if (!containerEl) {
      throw new Error('No container el');
    }

    // const clientY = (typeof (ev as MouseEvent).clientY === 'number')
    const clientY = isTouchOnly()
      ? (ev as TouchEvent).touches[0].clientY
      : (ev as MouseEvent).clientY;
    this._renderer.removeClass(this.splitTopEl(), ANIMATABLE_CLASS);
    this._renderer.removeClass(this.splitBottomEl(), ANIMATABLE_CLASS);
    this._isDrag = true;
    const bounds = containerEl.getBoundingClientRect();
    const h = containerEl.offsetHeight;
    const headerHeight = bounds.top;

    let percentage = ((clientY - headerHeight) / h) * 100;
    if (percentage > 100) {
      percentage = 100;
    }
    if (percentage < 0) {
      percentage = 0;
    }
    this._updatePos(percentage);
  }

  private _updatePos(pos: number | undefined, isWasOutsideChange: boolean = false): void {
    if (typeof pos !== 'number') {
      throw new Error('Invalid pos');
    }

    this.pos = pos;
    const splitTopEl = this.splitTopEl();
    const splitBottomEl = this.splitBottomEl();
    if (splitTopEl && splitBottomEl) {
      this._renderer.setStyle(splitTopEl, 'height', `${pos}%`);
      this._renderer.setStyle(splitBottomEl, 'height', `${100 - pos}%`);
      // this._renderer.setStyle(
      //   this._el.nativeElement,
      //   'top',
      //   `${pos}%`,
      // );

      if (!isWasOutsideChange) {
        this.posChanged.emit(pos);
      }
    }
  }
}
