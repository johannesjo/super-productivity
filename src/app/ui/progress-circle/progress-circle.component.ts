import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  Renderer2,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'progress-circle',
  templateUrl: './progress-circle.component.html',
  styleUrls: ['./progress-circle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressCircleComponent {
  private readonly _renderer = inject(Renderer2);

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set progress(progressIN: number) {
    const progressCircle = this.progressCircle();
    if (progressCircle) {
      let progress = progressIN || 0;
      if (progress > 100) {
        progress = 100;
      }

      this._renderer.setStyle(
        progressCircle.nativeElement,
        'stroke-dasharray',
        `${progress} ,100`,
      );
    }
  }

  readonly progressCircle = viewChild<ElementRef>('progressCircle');
}
