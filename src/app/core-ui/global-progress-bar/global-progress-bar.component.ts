import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GlobalProgressBarService } from './global-progress-bar.service';
import {
  fadeAnimation,
  fadeInOutBottomAnimation,
  fadeOutAnimation,
} from '../../ui/animations/fade.ani';
import { MatProgressBar } from '@angular/material/progress-bar';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'global-progress-bar',
  templateUrl: './global-progress-bar.component.html',
  styleUrls: ['./global-progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, fadeInOutBottomAnimation, fadeOutAnimation],
  imports: [MatProgressBar, AsyncPipe, TranslatePipe],
})
export class GlobalProgressBarComponent {
  globalProgressBarService = inject(GlobalProgressBarService);
}
