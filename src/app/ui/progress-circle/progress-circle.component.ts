import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  Renderer2,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'progress-circle',
  templateUrl: './progress-circle.component.html',
  styleUrls: ['./progress-circle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressCircleComponent {
  @Input() set progress(progressIN: number) {
    if (this.progressCircle) {
      let progress = progressIN || 0;
      if (progress > 100) {
        progress = 100;
      }

      this._renderer.setStyle(
        this.progressCircle.nativeElement,
        'stroke-dasharray',
        `${progress} ,100`,
      );
    }
  }

  @ViewChild('progressCircle', { static: true }) progressCircle?: ElementRef;

  constructor(private readonly _renderer: Renderer2) {}
}
