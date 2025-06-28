import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';

@Component({
  selector: 'finish-day-btn',
  templateUrl: './finish-day-btn.component.html',
  styleUrls: ['./finish-day-btn.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButton, MatIcon, MatTooltip, TranslatePipe],
})
export class FinishDayBtnComponent {
  hasDoneTasks = input.required<boolean>();
  T = T;
}
