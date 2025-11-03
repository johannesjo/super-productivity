import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

const STROKE_WIDTH = 2;
const VIEWBOX_SIZE = 40;

@Component({
  selector: 'progress-circle',
  standalone: true,
  templateUrl: './progress-circle.component.html',
  styleUrls: ['./progress-circle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressCircleComponent {
  private _progress: number | null = null;
  private _color: string | null = null;

  readonly size = VIEWBOX_SIZE;
  readonly strokeWidth = STROKE_WIDTH;
  readonly center = VIEWBOX_SIZE / 2;
  readonly radius = this.center - STROKE_WIDTH;
  readonly circumference = 2 * Math.PI * this.radius;

  @Input()
  set progress(value: number | null | undefined) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      this._progress = Math.min(100, Math.max(0, value));
    } else {
      this._progress = null;
    }
  }
  get progress(): number | null {
    return this._progress;
  }

  @Input() isPulsing = false;

  @Input()
  set color(value: string | null | undefined) {
    this._color = value ?? null;
  }
  get color(): string | null {
    return this._color;
  }

  @HostBinding('style.--progress-circle-color')
  get hostColor(): string | null {
    return this._color;
  }

  get showProgress(): boolean {
    return this._progress !== null && !this.isPulsing;
  }

  get dashOffset(): number {
    if (this._progress === null) {
      return this.circumference;
    }
    const progressRatio = this._progress / 100;
    return this.circumference * (1 - progressRatio);
  }
}
