import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type RocketState = `pulse-${number}` | 'launch';

@Component({
  selector: 'focus-mode-preparation-rocket',
  standalone: true,
  templateUrl: './focus-mode-preparation-rocket.component.html',
  styleUrls: ['./focus-mode-preparation-rocket.component.scss'],
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModePreparationRocketComponent {
  readonly state = input<RocketState>('pulse-5');
}
