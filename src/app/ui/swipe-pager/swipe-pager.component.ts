import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  contentChild,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  output,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  classifyGesture,
  getPanOffset,
  getReleaseDirection,
  getSettleDurationMs,
  getVelocityX,
  SwipePagerDirection,
  VELOCITY_WINDOW_MS,
} from './swipe-pager-gesture';
import { isTouchActive } from '../../util/input-intent';

export interface SwipePagerPageContext<T> {
  $implicit: T;
  isCurrent: boolean;
}

/**
 * Marks the page template of a `swipe-pager`. Bind it to the current page so
 * the template's `let-page` is typed: `<ng-template [swipePagerPage]="page()" let-p>`.
 */
@Directive({
  selector: 'ng-template[swipePagerPage]',
  standalone: true,
})
export class SwipePagerPageDirective<T> {
  readonly swipePagerPage = input<T>();
  readonly templateRef = inject<TemplateRef<SwipePagerPageContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: SwipePagerPageDirective<T>,
    ctx: unknown,
  ): ctx is SwipePagerPageContext<T> {
    return true;
  }
}

interface PageSlot<T> {
  key: unknown;
  item: T;
  offset: -1 | 0 | 1;
}

const SETTLE_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
/** Extra wait before finishing a settle whose transitionend never fired. */
const SETTLE_FALLBACK_SLACK_MS = 50;
/** Prewarm no later than this, even if the main thread never goes idle. */
const PREWARM_TIMEOUT_MS = 2000;
/** Where requestIdleCallback is missing (older Safari): after the open settles. */
const PREWARM_FALLBACK_DELAY_MS = 500;

/**
 * Horizontally paged content that follows the finger: a pan drags the current
 * page aside with its neighbour sliding in, and the release settles on one of
 * them. The pager only moves pages; the host changes `current` in response to
 * `navigate`.
 *
 * Neighbour pages are rendered only once `isWarm` is true. The pager sets it
 * when idle after the first render while touch is the active input (so the
 * first pan does not pay for rendering them mid-gesture), on the first touch,
 * or on a `go()` call. A host can skip computing neighbours for mouse users by
 * passing `prev`/`next` only while warm.
 *
 * Neighbours are inert and share the vertical scroll position of the current
 * page; overflow is clipped without creating a scroll container, so sticky
 * headers inside the pages keep working.
 */
@Component({
  selector: 'swipe-pager',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './swipe-pager.component.html',
  styleUrl: './swipe-pager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwipePagerComponent<T> {
  readonly prev = input<T | null>(null);
  readonly current = input.required<T>();
  readonly next = input<T | null>(null);
  /** Identifies a page across navigations, so its view is kept and moved. */
  readonly trackKey = input<(item: T) => unknown>((item) => item);
  readonly isEnabled = input<boolean>(true);
  readonly isWarm = model<boolean>(false);
  readonly navigate = output<SwipePagerDirection>();

  readonly pageTpl = contentChild.required(SwipePagerPageDirective<T>);

  private readonly _track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly _host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly _injector = inject(Injector);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _prefersReducedMotion =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  readonly slots = computed<PageSlot<T>[]>(() => {
    const keyOf = this.trackKey();
    const slots: PageSlot<T>[] = [];
    const add = (item: T | null, offset: PageSlot<T>['offset']): void => {
      if (item !== null && item !== undefined) {
        slots.push({ key: keyOf(item), item, offset });
      }
    };
    if (this.isWarm()) {
      add(this.prev(), -1);
    }
    add(this.current(), 0);
    if (this.isWarm()) {
      add(this.next(), 1);
    }
    return slots;
  });

  private _state: 'idle' | 'pending' | 'panning' | 'ignored' | 'settling' = 'idle';
  private _touchId: number | null = null;
  private _startX = 0;
  private _startY = 0;
  private _startTime = 0;
  private _offsetX = 0;
  private _samples: { x: number; t: number }[] = [];
  private _settleTimeout?: number;
  private _prewarmHandle?: number;

  constructor() {
    const host = this._host;
    host.addEventListener('touchstart', this._onTouchStart, { passive: true });
    // Not passive: once a pan is claimed, preventDefault stops vertical drift.
    host.addEventListener('touchmove', this._onTouchMove, { passive: false });
    host.addEventListener('touchend', this._onTouchEnd);
    host.addEventListener('touchcancel', this._onTouchCancel);
    inject(DestroyRef).onDestroy(() => {
      host.removeEventListener('touchstart', this._onTouchStart);
      host.removeEventListener('touchmove', this._onTouchMove);
      host.removeEventListener('touchend', this._onTouchEnd);
      host.removeEventListener('touchcancel', this._onTouchCancel);
      window.clearTimeout(this._settleTimeout);
      if (this._prewarmHandle !== undefined) {
        if (typeof cancelIdleCallback === 'function') {
          cancelIdleCallback(this._prewarmHandle);
        } else {
          window.clearTimeout(this._prewarmHandle);
        }
      }
    });
    afterNextRender(() => this._schedulePrewarm());
  }

  private _schedulePrewarm(): void {
    const prewarm = (): void => {
      this._prewarmHandle = undefined;
      if (this.isEnabled() && isTouchActive() && !this.isWarm()) {
        this.isWarm.set(true);
      }
    };
    this._prewarmHandle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(prewarm, { timeout: PREWARM_TIMEOUT_MS })
        : window.setTimeout(prewarm, PREWARM_FALLBACK_DELAY_MS);
  }

  /** Animates to a neighbour page, e.g. from a prev/next button. */
  go(direction: SwipePagerDirection): void {
    if (this._state !== 'idle') {
      return;
    }
    if (!this.isWarm()) {
      this.isWarm.set(true);
      afterNextRender(() => this.go(direction), { injector: this._injector });
      return;
    }
    if (!this._hasPage(direction)) {
      return;
    }
    this._offsetX = 0;
    this._settle(direction, 0);
  }

  private _onTouchStart = (ev: TouchEvent): void => {
    if (this._state === 'settling') {
      return;
    }
    if (ev.touches.length > 1) {
      // A second finger (pinch) is never a page swipe.
      this._cancelPan();
      this._state = 'ignored';
      return;
    }
    const touch = ev.touches[0];
    if (!touch || !this.isEnabled()) {
      return;
    }
    if (!this.isWarm()) {
      this.isWarm.set(true);
    }
    this._touchId = touch.identifier;
    this._startX = touch.clientX;
    this._startY = touch.clientY;
    this._startTime = Date.now();
    this._samples = [];
    this._state = 'pending';
  };

  private _onTouchMove = (ev: TouchEvent): void => {
    if (this._state !== 'pending' && this._state !== 'panning') {
      return;
    }
    const touch = this._findTouch(ev.touches);
    if (!touch) {
      return;
    }

    if (this._state === 'pending') {
      const claim = classifyGesture(
        touch.clientX - this._startX,
        touch.clientY - this._startY,
        Date.now() - this._startTime,
      );
      if (claim === null) {
        return;
      }
      if (claim === 'other' || !this.isEnabled()) {
        this._state = 'ignored';
        return;
      }
      this._state = 'panning';
      // Start following from here, so the page does not jump by the threshold.
      this._startX = touch.clientX;
      const track = this._track().nativeElement;
      track.style.transition = 'none';
      track.style.willChange = 'transform';
    }

    if (ev.cancelable) {
      ev.preventDefault();
    }
    const now = Date.now();
    this._samples.push({ x: touch.clientX, t: now });
    while (this._samples.length > 2 && now - this._samples[0].t > VELOCITY_WINDOW_MS) {
      this._samples.shift();
    }
    this._offsetX = getPanOffset(
      touch.clientX - this._startX,
      this._hasPage(-1),
      this._hasPage(1),
    );
    this._applyOffset(this._offsetX);
  };

  private _onTouchEnd = (ev: TouchEvent): void => {
    const touch = this._findTouch(ev.changedTouches);
    if (!touch) {
      return;
    }
    this._touchId = null;
    if (this._state !== 'panning') {
      if (this._state !== 'settling') {
        this._state = 'idle';
      }
      return;
    }
    this._samples.push({ x: touch.clientX, t: Date.now() });
    const velocityX = getVelocityX(this._samples);
    const direction = getReleaseDirection({
      deltaX: this._offsetX,
      velocityX,
      width: this._host.clientWidth,
      hasPrev: this._hasPage(-1),
      hasNext: this._hasPage(1),
    });
    this._settle(direction, velocityX);
  };

  private _onTouchCancel = (): void => {
    this._touchId = null;
    this._cancelPan();
  };

  private _cancelPan(): void {
    if (this._state === 'panning') {
      this._settle(0, 0);
    } else if (this._state !== 'settling') {
      this._state = 'idle';
    }
  }

  private _settle(direction: SwipePagerDirection | 0, velocityX: number): void {
    this._state = 'settling';
    const width = this._host.clientWidth;
    const target = -direction * width;
    const duration = this._prefersReducedMotion
      ? 0
      : getSettleDurationMs(target - this._offsetX, velocityX);
    const track = this._track().nativeElement;

    if (duration === 0) {
      this._finishSettle(direction);
      return;
    }

    let isDone = false;
    const done = (): void => {
      if (isDone) {
        return;
      }
      isDone = true;
      track.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(this._settleTimeout);
      this._finishSettle(direction);
    };
    const onTransitionEnd = (ev: TransitionEvent): void => {
      if (ev.target === track && ev.propertyName === 'transform') {
        done();
      }
    };
    track.addEventListener('transitionend', onTransitionEnd);
    this._settleTimeout = window.setTimeout(done, duration + SETTLE_FALLBACK_SLACK_MS);

    track.style.willChange = 'transform';
    track.style.transition = `transform ${duration}ms ${SETTLE_EASING}`;
    this._applyOffset(target);
  }

  private _finishSettle(direction: SwipePagerDirection | 0): void {
    if (direction === 0) {
      this._resetTrack();
      return;
    }
    // The host swaps `current`; the pages are keyed, so the neighbour's view is
    // moved into the centre slot. Reset the track only once that has rendered,
    // otherwise the old page flashes back for a frame.
    this.navigate.emit(direction);
    this._cdr.markForCheck();
    afterNextRender(() => this._resetTrack(), { injector: this._injector });
  }

  private _resetTrack(): void {
    const track = this._track().nativeElement;
    track.style.transition = 'none';
    track.style.transform = '';
    track.style.willChange = '';
    this._offsetX = 0;
    this._samples = [];
    this._state = 'idle';
  }

  private _applyOffset(offsetX: number): void {
    this._track().nativeElement.style.transform = `translate3d(${offsetX}px, 0, 0)`;
  }

  private _hasPage(direction: SwipePagerDirection): boolean {
    const item = direction === 1 ? this.next() : this.prev();
    return item !== null && item !== undefined;
  }

  private _findTouch(touches: TouchList): Touch | null {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this._touchId) {
        return touches[i];
      }
    }
    return null;
  }
}
