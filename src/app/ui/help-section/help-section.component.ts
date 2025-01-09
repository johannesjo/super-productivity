import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { expandFadeAnimation } from '../animations/expand.ani';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'help-section',
  templateUrl: './help-section.component.html',
  styleUrls: ['./help-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
  imports: [MatMiniFabButton, MatIcon],
})
export class HelpSectionComponent {
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() isShowHelp: boolean = false;
}
