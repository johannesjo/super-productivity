import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  input,
  output,
} from '@angular/core';
import { expandAnimation } from '../animations/expand.ani';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'collapsible',
  templateUrl: './collapsible.component.html',
  styleUrls: ['./collapsible.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  imports: [MatIcon],
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

  readonly isExpandedChange = output<boolean>();

  constructor() {}

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
    this.isExpandedChange.emit(this.isExpanded);
  }
}
