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
    this.isForProject = (v === WorkContextType.PROJECT);
    this.base = (this.isForProject)
      ? 'project'
      : 'tag';
  }
  isForProject: boolean;

  base: string;
  T = T;

  constructor() {
  }
}
