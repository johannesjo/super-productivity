import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { T } from '../../t.const';

@Component({
  selector: 'donate-page',
  templateUrl: './donate-page.component.html',
  styleUrls: ['./donate-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon],
  standalone: true,
})
export class DonatePageComponent {
  readonly T = T;
}
