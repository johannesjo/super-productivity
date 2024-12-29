import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  input,
} from '@angular/core';
import { expandAnimation } from '../animations/expand.ani';

@Component({
  selector: 'collapsible',
  templateUrl: './collapsible.component.html',
  styleUrls: ['./collapsible.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  standalone: false,
})
export class CollapsibleComponent {
  readonly title = input<string>();
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() icon?: string;

  readonly isIconBefore = input<boolean>(false);

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @HostBinding('class.isExpanded') @Input() isExpanded: boolean = false;
  // TODO: Skipped for migration because:
  //  This input is used in combination with `@HostBinding` and migrating would
  //  break.
  @HostBinding('class.isInline') @Input() isInline: boolean = false;

  @Output() isExpandedChange: EventEmitter<boolean> = new EventEmitter();

  constructor() {}

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
    this.isExpandedChange.emit(this.isExpanded);
  }
}
