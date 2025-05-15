import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostBinding,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';

import {
  WorkContextCommon,
  WorkContextType,
} from '../../../features/work-context/work-context.model';
import { Project } from '../../../features/project/project.model';
import { WorkContextMenuComponent } from '../../work-context-menu/work-context-menu.component';
import { ContextMenuComponent } from '../../../ui/context-menu/context-menu.component';
import { CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuItem } from '@angular/material/menu';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAllDoneIds } from '../../../features/tasks/store/task.selectors';
import { Store } from '@ngrx/store';

@Component({
  selector: 'side-nav-item',
  imports: [
    RouterLink,
    RouterModule,
    WorkContextMenuComponent,
    ContextMenuComponent,
    CdkDragPlaceholder,
    MatIconButton,
    MatIcon,
    MatMenuItem,
  ],
  templateUrl: './side-nav-item.component.html',
  styleUrl: './side-nav-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'g-multi-btn-wrapper' },
  standalone: true,
})
export class SideNavItemComponent {
  private readonly _store = inject(Store);

  workContext = input.required<WorkContextCommon>();
  type = input.required<WorkContextType>();
  defaultIcon = input.required<string>();
  activeWorkContextId = input.required<string>();

  allUndoneTaskIds = toSignal(this._store.select(selectAllDoneIds), { initialValue: [] });
  nrOfOpenTasks = computed<number>(() => {
    // const allUndoneTasks
    const allUndoneTaskIds = this.allUndoneTaskIds();
    return this.workContext().taskIds.filter((tid) => !allUndoneTaskIds.includes(tid))
      .length;
  });

  readonly routeBtn = viewChild.required('routeBtn', { read: ElementRef });

  @HostBinding('class.hasTasks')
  get workContextHasTasks(): boolean {
    return this.workContext().taskIds.length > 0;
  }

  @HostBinding('class.isActiveContext')
  get isActiveContext(): boolean {
    return this.workContext().id === this.activeWorkContextId();
  }

  @HostBinding('class.isHidden')
  get isHidden(): boolean {
    return !!(this.workContext() as Project)?.isHiddenFromMenu;
  }

  focus(): void {
    this.routeBtn().nativeElement.focus();
  }
}
