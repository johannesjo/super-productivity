import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ALL_THEMES } from '../../app.constants';
import { T } from '../../t.const';

// TODO remove unused component

@Component({
  selector: 'theme-select',
  templateUrl: './theme-select.component.html',
  styleUrls: ['./theme-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSelectComponent {
  T: typeof T = T;
  themes: string[] = ALL_THEMES;

  trackBy(i: number, theme: string): number {
    return i;
  }
}
