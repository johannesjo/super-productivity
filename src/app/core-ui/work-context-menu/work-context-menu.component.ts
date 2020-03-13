import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {WorkContextType} from '../../features/work-context/work-context.model';
import {T} from 'src/app/t.const';

@Component({
  selector: 'work-context-menu',
  templateUrl: './work-context-menu.component.html',
  styleUrls: ['./work-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkContextMenuComponent implements OnInit {
  @Input() contextType: WorkContextType;
  @Input() contextId: string;

  base: string;
  T = T;

  constructor() {
  }

  ngOnInit(): void {
    this.base = (this.contextType === WorkContextType.PROJECT)
      ? 'project'
      : 'tag';
  }
}
