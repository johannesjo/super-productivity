import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';

@Component({
  selector: 'breathing-dot',
  templateUrl: './breathing-dot.component.html',
  styleUrls: ['./breathing-dot.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class BreathingDotComponent {
  @HostBinding('class.breathing-dot') true = true;
}
