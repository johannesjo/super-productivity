import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { expandFadeAnimation } from '../animations/expand.ani';

@Component({
  selector: 'help-section',
  templateUrl: './help-section.component.html',
  styleUrls: ['./help-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
})
export class HelpSectionComponent {
  @Input() isShowHelp: boolean = false;

  constructor() {}
}
