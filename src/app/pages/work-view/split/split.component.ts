import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

const ANIMATABLE_CLASS = 'isAnimatable';

@Component({
  selector: 'split',
  templateUrl: './split.component.html',
  styleUrls: ['./split.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplitComponent implements OnInit {
  @Input() splitTopEl;
  @Input() splitBottomEl;
  @Input() containerEl;
  @Input() counter;
  @Output() posChanged: EventEmitter<number> = new EventEmitter();

  pos: number;
  subscription: Subscription;
  @ViewChild('buttonEl') buttonEl;
  private _isDrag = false;

  constructor(private _renderer: Renderer2) {
  }

  @Input() set splitPos(pos: number) {
    if (pos !== this.pos) {
      this._renderer.addClass(this.splitTopEl, ANIMATABLE_CLASS);
      this._renderer.addClass(this.splitBottomEl, ANIMATABLE_CLASS);
      this._updatePos(pos, true);
    }
  }

  ngOnInit() {
    // console.log(this.splitTopEl);
    // console.log(this.containerEl);
    // console.log(this.splitBottomEl);
    // console.log(this.buttonEl);
  }

  toggle() {
    this._renderer.addClass(this.splitTopEl, ANIMATABLE_CLASS);
    this._renderer.addClass(this.splitBottomEl, ANIMATABLE_CLASS);
    let newPos = 50;
    if (this.pos > 45 && this.pos < 55) {
      newPos = 100;
    }
    this._updatePos(newPos);
  }

  onMouseDown(ev) {
    this._isDrag = false;
    // console.log('onMouseDown', ev);
    const mouseup$ = fromEvent(document, 'mouseup');
    this.subscription = mouseup$.subscribe((e: MouseEvent) => this.onMouseUp(e));

    const mousemove$ = fromEvent(document, 'mousemove')
      .pipe(takeUntil(mouseup$))
      .subscribe((e: MouseEvent) => this.onMouseMove(e));

    this.subscription.add(mousemove$);
  }

  onMouseUp(ev): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    if (!this._isDrag) {
      this.toggle();
    }
  }

  onMouseMove(ev) {
    this._renderer.removeClass(this.splitTopEl, ANIMATABLE_CLASS);
    this._renderer.removeClass(this.splitBottomEl, ANIMATABLE_CLASS);
    this._isDrag = true;
    const bounds = this.containerEl.getBoundingClientRect();
    const h = this.containerEl.offsetHeight;
    const headerHeight = bounds.top;

    let percentage = (ev.clientY - headerHeight) / h * 100;
    if (percentage > 100) {
      percentage = 100;
    }
    if (percentage < 0) {
      percentage = 0;
    }
    // console.log(percentage, h, ev.clientY);

    this._updatePos(percentage);
  }

  private _updatePos(pos: number, isWasOutsideChange = false) {
    this.pos = pos;
    if (this.splitTopEl && this.splitBottomEl) {
      this._renderer.setStyle(
        this.splitTopEl,
        'height',
        `${pos}%`,
      );
      this._renderer.setStyle(
        this.splitBottomEl,
        'height',
        `${100 - pos}%`,
      );
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
