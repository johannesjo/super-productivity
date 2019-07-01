import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from '@angular/core';
import {expandAnimation} from '../animations/expand.ani';

@Component({
  selector: 'collapsible',
  templateUrl: './collapsible.component.html',
  styleUrls: ['./collapsible.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class CollapsibleComponent {
  @Input() title: string;
  @Input() icon: string;
  @Input() counter = null;
  // TODO remove
  @Input() initiallyExpanded = false;
  @Input() btnIcon: string;
  @Input() btnAction: Function;

  @HostBinding('class.isExpanded') @Input() isExpanded: boolean;
  @Output() isExpandedChange: EventEmitter<boolean> = new EventEmitter();

  constructor() {
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    this.isExpandedChange.emit(this.isExpanded);
  }

  execAction(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    this.btnAction();
  }
}
