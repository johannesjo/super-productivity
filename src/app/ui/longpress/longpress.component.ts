import {
  Directive,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';

@Directive({
  selector: '[longPress]',
})
export class LongPressDirective implements OnDestroy {
  @Input() longPressDuration: number = 400;

  @Output()
  longPress: EventEmitter<MouseEvent | TouchEvent> = new EventEmitter();

  private longPressTimeout: any;

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: TouchEvent | MouseEvent): void {
    this.longPressTimeout = window.setTimeout(() => {
      this.longPress.emit(event);
    }, this.longPressDuration);
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
