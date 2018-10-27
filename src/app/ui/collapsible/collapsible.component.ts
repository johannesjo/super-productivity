import { ChangeDetectionStrategy, Component, HostBinding, Input, OnInit } from '@angular/core';
import { expandAnimation } from '../animations/expand.ani';

@Component({
  selector: 'collapsible',
  templateUrl: './collapsible.component.html',
  styleUrls: ['./collapsible.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class CollapsibleComponent implements OnInit {
  @Input() title: string;
  @Input() icon: string;
  @Input() counter = null;
  @Input() initiallyExpanded = false;
  @Input() btnIcon: string;
  @Input() btnAction: Function;

  @HostBinding('class.isExpanded') isExpanded;

  constructor() {
  }

  ngOnInit() {
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  execAction(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    this.btnAction();
  }
}
