import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  effect,
  Renderer2,
  viewChild,
  linkedSignal,
  OnDestroy,
} from '@angular/core';
import { lazySetInterval } from '../../../../electron/shared-with-frontend/lazy-set-interval';

const TICK = 1000;

@Component({
  selector: 'progress-circle',
  templateUrl: './progress-circle.component.html',
  styleUrls: ['./progress-circle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressCircleComponent implements OnDestroy {
  private readonly _renderer = inject(Renderer2);

  progress = input<number>();
  progressIntermediary = linkedSignal(() => this.progress() || 0);
  autoRotationDuration = input<number | undefined>();

  readonly progressCircle = viewChild<ElementRef>('progressCircle');

  private _timeOutCancelFn?: () => void;

  constructor() {
    effect(() => {
      const autoRotation = this.autoRotationDuration();
      if (autoRotation) {
        const step = autoRotation / TICK;
        const percentagePerStep = 100 / step;

        this._timeOutCancelFn = lazySetInterval(() => {
          const newProgress = this.progressIntermediary() + percentagePerStep;

          this.progressIntermediary.set(
            newProgress >= 100 ? newProgress - 100 : newProgress,
          );
        }, TICK);
      }
    });

    effect(() => {
      const progressCircle = this.progressCircle();
      if (progressCircle) {
        let progress = this.progressIntermediary() || 0;
        if (progress > 100) {
          progress = 100;
        }

        this._renderer.setStyle(
          progressCircle.nativeElement,
          'stroke-dasharray',
          `${progress} ,100`,
        );
      }
    });
  }

  ngOnDestroy(): void {
    if (this._timeOutCancelFn) {
      this._timeOutCancelFn();
    }
  }
}
