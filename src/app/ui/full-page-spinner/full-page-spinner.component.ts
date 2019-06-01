import {Component, OnInit, ChangeDetectionStrategy, Input} from '@angular/core';
import {fadeAnimation} from '../animations/fade.ani';

@Component({
  selector: 'full-page-spinner',
  templateUrl: './full-page-spinner.component.html',
  styleUrls: ['./full-page-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
})
export class FullPageSpinnerComponent {
  @Input() show: boolean;
}
