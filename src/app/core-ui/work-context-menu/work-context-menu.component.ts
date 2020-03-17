import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {WorkContextType} from '../../features/work-context/work-context.model';
import {T} from 'src/app/t.const';

@Component({
  selector: 'work-context-menu',
  templateUrl: './work-context-menu.component.html',
  styleUrls: ['./work-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkContextMenuComponent {
  @Input() contextId: string;

  @Input('contextType') set contextTypeSet(v: WorkContextType) {
    this.base = (v === WorkContextType.PROJECT)
      ? 'project'
      : 'tag';
  }


  base: string;
  T = T;

  constructor() {
  }
}
