import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ALL_THEMES } from '../../app.constants';



@Component({
  selector: 'theme-select',
  templateUrl: './theme-select.component.html',
  styleUrls: ['./theme-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeSelectComponent {
  public themes = ALL_THEMES;
}
