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
  longPress: EventEmitter<void> = new EventEmitter();

  private longPressTimeout: any;

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.longPressTimeout = window.setTimeout(() => {
      this.longPress.emit();
    }, this.longPressDuration);
  }

  @HostListener('touchend')
  @HostListener('mouseup')
  @HostListener('mouseleave')
  longPressInterupt() {
    window.clearTimeout(this.longPressTimeout);
  }

  ngOnDestroy(): void {
    if (this.longPressTimeout) {
      window.clearTimeout(this.longPressTimeout);
    }
  }
}
