import {
  Directive,
  HostListener,
  output,
  input,
  ElementRef,
  Renderer2,
  NgZone,
  inject,
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
export class PanDirective {
  readonly panstart = output<PanEvent>();
  readonly panmove = output<PanEvent>();
  readonly panend = output<PanEvent>();
  readonly panleft = output<PanEvent>();
  readonly panright = output<PanEvent>();
  readonly panup = output<PanEvent>();
  readonly pandown = output<PanEvent>();
  readonly pancancel = output<PanEvent>();

  // Configuration
  readonly panThreshold = input(10); // Minimum distance to start panning
  readonly panEnabled = input(true);

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private lastX = 0;
  private lastY = 0;
  private isPanning = false;
  private touchIdentifier: number | null = null;
  private lastDirection: 'left' | 'right' | 'up' | 'down' | null = null;

  private readonly elementRef = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly ngZone = inject(NgZone);

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.panEnabled() || this.touchIdentifier !== null) {
      return;
    }

    const touch = event.changedTouches[0];
    this.touchIdentifier = touch.identifier;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.lastX = touch.clientX;
    this.lastY = touch.clientY;
    this.startTime = Date.now();
    this.isPanning = false;
    this.lastDirection = null;

    // Create pan event
    const panEvent = this.createPanEvent(event, 0, 0, false, 1); // eventType: 1 = start

    // Run outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      this.panstart.emit(panEvent);
    });
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.panEnabled() || this.touchIdentifier === null) {
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
    }

    if (this.isPanning) {
      // Prevent default to avoid scrolling
      event.preventDefault();

      const panEvent = this.createPanEvent(event, deltaX, deltaY, false, 2); // eventType: 2 = move

      // Determine direction
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      let currentDirection: 'left' | 'right' | 'up' | 'down' | null = null;

      if (absX > absY) {
        currentDirection = deltaX > 0 ? 'right' : 'left';
      } else if (absY > absX) {
        currentDirection = deltaY > 0 ? 'down' : 'up';
      }

      // Run outside Angular zone for performance
      this.ngZone.runOutsideAngular(() => {
        // Emit direction-specific events
        if (currentDirection !== this.lastDirection) {
          this.lastDirection = currentDirection;

          switch (currentDirection) {
            case 'left':
              this.panleft.emit(panEvent);
              break;
            case 'right':
              this.panright.emit(panEvent);
              break;
            case 'up':
              this.panup.emit(panEvent);
              break;
            case 'down':
              this.pandown.emit(panEvent);
              break;
          }
        }

        this.panmove.emit(panEvent);
      });
    }

    this.lastX = currentX;
    this.lastY = currentY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.panEnabled() || this.touchIdentifier === null) {
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

    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;

    if (this.isPanning) {
      const panEvent = this.createPanEvent(event, deltaX, deltaY, true, 4); // eventType: 4 = end

      // Run in Angular zone for final event
      this.ngZone.run(() => {
        this.panend.emit(panEvent);
      });
    }

    // Reset state
    this.reset();
  }

  @HostListener('touchcancel', ['$event'])
  onTouchCancel(event: TouchEvent): void {
    if (!this.panEnabled() || this.touchIdentifier === null) {
      return;
    }

    if (this.isPanning) {
      const deltaX = this.lastX - this.startX;
      const deltaY = this.lastY - this.startY;
      const panEvent = this.createPanEvent(event, deltaX, deltaY, true, 8); // eventType: 8 = cancel

      this.ngZone.run(() => {
        this.pancancel.emit(panEvent);
      });
    }

    this.reset();
  }

  private reset(): void {
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.isPanning = false;
    this.touchIdentifier = null;
    this.lastDirection = null;
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
