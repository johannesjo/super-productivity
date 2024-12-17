import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { fadeAnimation } from '../animations/fade.ani';

@Component({
  selector: 'full-page-spinner',
  templateUrl: './full-page-spinner.component.html',
  styleUrls: ['./full-page-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  standalone: false,
})
export class FullPageSpinnerComponent {
  @HostBinding('@fade') show: boolean = true;
}
