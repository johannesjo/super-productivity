import {
  Directive,
  HostListener,
  output,
  input,
  NgZone,
  inject,
  OnDestroy,
} from '@angular/core';

export interface PanEvent {
  deltaX: number;
  deltaY: number;
  deltaTime: number;
  isFinal: boolean;
  eventType: number;
  target: EventTarget | null;
  preventDefault: () => void;
}

/**
 * Pan gesture directive for touch interactions
 * Detects pan movements in all directions
 */
@Directive({
  selector: '[panGesture]',
  standalone: true,
})
export class PanDirective implements OnDestroy {
  readonly panstart = output<PanEvent>();
  readonly panend = output<void>();
  readonly panleft = output<PanEvent>();
  readonly panright = output<PanEvent>();

  // Configuration
  readonly panThreshold = input(10); // Minimum distance to start panning

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private isPanning = false;
  private touchIdentifier: number | null = null;
  private isScrolling = false;
  private scrollTimeout: any = null;
  private scrollListener: (() => void) | null = null;
  private scrollableParent: HTMLElement | null = null;

  private readonly ngZone = inject(NgZone);

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    // Clean up any pending timeout when directive is destroyed
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }

    // Remove scroll listener if attached
    if (this.scrollListener && this.scrollableParent) {
      this.scrollableParent.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
      this.scrollableParent = null;
    }
  }

  private findScrollableParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (
        style.overflow === 'auto' ||
        style.overflow === 'scroll' ||
        style.overflowY === 'auto' ||
        style.overflowY === 'scroll'
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return document.documentElement; // Fallback to document scroll
  }

  private attachScrollListener(element: HTMLElement): void {
    // Only attach if we haven't already
    if (this.scrollListener) {
      return;
    }

    this.scrollableParent = this.findScrollableParent(element);
    if (!this.scrollableParent) {
      return;
    }

    this.scrollListener = () => {
      this.isScrolling = true;

      // Clear any existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // Set scrolling to false after scroll stops
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 150);
    };

    this.scrollableParent.addEventListener('scroll', this.scrollListener, {
      passive: true,
    });
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    // Reset if we have a stale touchIdentifier
    if (this.touchIdentifier !== null) {
      this.reset();
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    // Attach scroll listener on demand when touch starts
    this.attachScrollListener(event.target as HTMLElement);

    this.touchIdentifier = touch.identifier;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
    this.isPanning = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (this.touchIdentifier === null) {
      return;
    }

    // Find matching touch
    let touch: Touch | null = null;
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === this.touchIdentifier) {
        touch = event.touches[i];
        break;
      }
    }

    if (!touch) {
      return;
    }

    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - this.startX;
    const deltaY = currentY - this.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Don't start panning if scrolling is detected
    if (this.isScrolling && !this.isPanning) {
      return;
    }

    // Check if we should start panning
    // Only start panning for primarily horizontal movements
    // Use a higher threshold for horizontal movement and ensure it's more horizontal than vertical
    if (!this.isPanning && absX >= this.panThreshold() && absX > absY * 1.5) {
      // Additional check: if vertical movement is significant, likely scrolling
      if (absY > 20) {
        this.isScrolling = true;
        return;
      }

      this.isPanning = true;

      // Emit panstart when we first start panning
      const startEvent = this.createPanEvent(event, deltaX, deltaY, false, 1); // eventType: 1 = start
      this.ngZone.run(() => {
        this.panstart.emit(startEvent);
      });
    }

    if (this.isPanning) {
      // Prevent default to avoid scrolling
      event.preventDefault();

      const panEvent = this.createPanEvent(event, deltaX, deltaY, false, 2); // eventType: 2 = move

      // Emit continuous pan events
      // Run in Angular zone for event emission
      this.ngZone.run(() => {
        // Emit direction-specific events for horizontal pan
        if (absX > absY) {
          if (deltaX < 0) {
            this.panleft.emit(panEvent);
          } else {
            this.panright.emit(panEvent);
          }
        }
      });
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (this.touchIdentifier === null) {
      return;
    }

    // Find matching touch
    let touch: Touch | null = null;
    for (let i = 0; i < event.changedTouches.length; i++) {
      if (event.changedTouches[i].identifier === this.touchIdentifier) {
        touch = event.changedTouches[i];
        break;
      }
    }

    if (!touch) {
      return;
    }

    if (this.isPanning) {
      // Run in Angular zone for final event
      this.ngZone.run(() => {
        this.panend.emit();
      });
    }

    // Reset state
    this.reset();
  }

  @HostListener('touchcancel')
  onTouchCancel(): void {
    if (this.touchIdentifier === null) {
      return;
    }

    // Just reset on cancel
    this.reset();
  }

  private reset(): void {
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.isPanning = false;
    this.touchIdentifier = null;
    this.isScrolling = false;

    // Clean up scroll listener when touch interaction ends
    this.cleanup();
  }

  private createPanEvent(
    originalEvent: TouchEvent,
    deltaX: number,
    deltaY: number,
    isFinal: boolean,
    eventType: number,
  ): PanEvent {
    const deltaTime = Date.now() - this.startTime;

    return {
      deltaX,
      deltaY,
      deltaTime,
      isFinal,
      eventType,
      target: originalEvent.target,
      preventDefault: () => originalEvent.preventDefault(),
    };
  }
}
