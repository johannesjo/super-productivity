import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnInit,
  Output,
  Renderer2,
  ViewChild
} from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'split',
  templateUrl: './split.component.html',
  styleUrls: ['./split.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplitComponent implements OnInit {
  @Input() splitEl1;
  @Input() splitEl2;
  @Input() containerEl;
  @Output() onHide: EventEmitter<'TOP' | 'BOTTOM'> = new EventEmitter();

  pos: number;
  subscription: Subscription;
  @ViewChild('buttonEl') buttonEl;

  constructor(private _renderer: Renderer2,
              private _el: ElementRef) {
  }

  @HostBinding('class.is2Visible') get is2Visible() {
    return this.pos !== 100;
  }

  @Input() set splitPos(pos: number) {
    // TODO activate transition here
    this._updatePos(pos);
  }

  ngOnInit() {
    console.log(this.splitEl1);
    console.log(this.containerEl);
    console.log(this.splitEl2);
    console.log(this.buttonEl);
  }

  toggle() {
    // TODO activate transition here
    let newPos = 50;
    if (this.pos === 50) {
      newPos = 100;
    }
    this._updatePos(newPos);
  }

  onMouseDown(ev) {
    // TODO deactivate transition here
    console.log('onMouseDown', ev);
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
  }

  onMouseMove(ev) {
    console.log('onMouseDown', ev);
    const h = this.containerEl.offsetHeight;
    const handleHeight = this.buttonEl._elementRef.nativeElement.offsetHeight * 3 / 2;
    console.log(handleHeight);

    let percentage = (ev.clientY - handleHeight) / h * 100;
    if (percentage > 100) {
      this.onHide.emit('BOTTOM');
      percentage = 100;
    }
    if (percentage < 0) {
      percentage = 0;
      this.onHide.emit('TOP');
    }
    console.log(percentage, h, ev.clientY);

    this._updatePos(percentage);
  }

  private _updatePos(pos: number) {
    this.pos = pos;
    if (pos === 100) {

    }

    if (this.splitEl1 && this.splitEl2) {
      this._renderer.setStyle(
        this.splitEl1,
        'height',
        `${pos}%`,
      );
      this._renderer.setStyle(
        this.splitEl2,
        'height',
        `${100 - pos}%`,
      );
      // this._renderer.setStyle(
      //   this._el.nativeElement,
      //   'top',
      //   `${pos}%`,
      // );
    }
  }
}
