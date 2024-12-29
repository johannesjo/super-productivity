import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { expandFadeAnimation } from '../animations/expand.ani';

@Component({
  selector: 'help-section',
  templateUrl: './help-section.component.html',
  styleUrls: ['./help-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
  standalone: false,
})
export class HelpSectionComponent {
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() isShowHelp: boolean = false;
}
