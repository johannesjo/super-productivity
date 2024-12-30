import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { fadeAnimation } from '../animations/fade.ani';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'full-page-spinner',
  templateUrl: './full-page-spinner.component.html',
  styleUrls: ['./full-page-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [MatProgressSpinner],
})
export class FullPageSpinnerComponent {
  @HostBinding('@fade') show: boolean = true;
}
