import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { expandAnimation } from '../animations/expand.ani';

@Component({
  selector: 'help-section',
  templateUrl: './help-section.component.html',
  styleUrls: ['./help-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations:[expandAnimation]
})
export class HelpSectionComponent implements OnInit {
  @Input() isShowHelp: boolean;

  constructor() {
  }

  ngOnInit() {
  }

}
