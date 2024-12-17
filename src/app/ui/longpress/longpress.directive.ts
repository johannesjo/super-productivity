import { Directive, EventEmitter, HostListener, OnDestroy, Output } from '@angular/core';
import { UI_LONG_PRESS_DURATION } from '../ui.const';

@Directive({
  selector: '[longPress]',
  standalone: false,
})
export class LongPressDirective implements OnDestroy {
  @Output()
  longPress: EventEmitter<MouseEvent | TouchEvent> = new EventEmitter();

  private longPressTimeout: any;

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: TouchEvent | MouseEvent): void {
    this.longPressTimeout = window.setTimeout(() => {
      this.longPress.emit(event);
    }, UI_LONG_PRESS_DURATION);
  }

  @HostListener('touchend')
  @HostListener('mouseup')
  @HostListener('mouseleave')
  longPressInterupt(): void {
    window.clearTimeout(this.longPressTimeout);
  }

  ngOnDestroy(): void {
    if (this.longPressTimeout) {
      window.clearTimeout(this.longPressTimeout);
    }
  }
}
