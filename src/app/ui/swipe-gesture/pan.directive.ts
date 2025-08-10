import { Directive, HostListener, output, input, NgZone, inject } from '@angular/core';

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
export class PanDirective {
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

  private readonly ngZone = inject(NgZone);

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
    const xSquared = deltaX * deltaX;
    const ySquared = deltaY * deltaY;
    const distance = Math.sqrt(xSquared + ySquared);

    // Check if we should start panning
    if (!this.isPanning && distance >= this.panThreshold()) {
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

      // Determine direction and emit events for horizontal pan
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

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
