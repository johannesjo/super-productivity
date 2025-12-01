import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'breathing-dot',
  templateUrl: './breathing-dot.component.html',
  styleUrls: ['./breathing-dot.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class BreathingDotComponent {
  readonly isPaused = input(false);
}
