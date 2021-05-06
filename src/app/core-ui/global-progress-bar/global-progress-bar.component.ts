import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GlobalProgressBarService } from './global-progress-bar.service';
import {
  fadeAnimation,
  fadeInOutBottomAnimation,
  fadeOutAnimation,
} from '../../ui/animations/fade.ani';

@Component({
  selector: 'global-progress-bar',
  templateUrl: './global-progress-bar.component.html',
  styleUrls: ['./global-progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, fadeInOutBottomAnimation, fadeOutAnimation],
})
export class GlobalProgressBarComponent {
  constructor(public globalProgressBarService: GlobalProgressBarService) {}
}
