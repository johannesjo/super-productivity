import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type RocketState = 'jiggle-even' | 'jiggle-odd' | 'launch';

@Component({
  selector: 'focus-mode-preparation-rocket',
  standalone: true,
  templateUrl: './focus-mode-preparation-rocket.component.html',
  styleUrls: ['./focus-mode-preparation-rocket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModePreparationRocketComponent {
  readonly state = input<RocketState>('jiggle-even');
}
