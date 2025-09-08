import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
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
import { TranslatePipe } from '@ngx-translate/core';

const HOST_HAS_TASKS = '[class.hasTasks]';
const HOST_IS_ACTIVE = '[class.isActiveContext]';
const HOST_IS_HIDDEN = '[class.isHidden]';
const HOST_VARIANT_NAV = '[class.variant-nav]';
const HOST_IS_COMPACT = '[class.compact]';

@Component({
  selector: 'nav-item-inner',
  imports: [
    RouterLink,
    RouterModule,
    WorkContextMenuComponent,
    ContextMenuComponent,
    CdkDragPlaceholder,
    MatIconButton,
    MatIcon,
    MatMenuItem,
    TranslatePipe,
  ],
  templateUrl: './nav-item-inner.component.html',
  styleUrl: './nav-item-inner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'g-multi-btn-wrapper',
    [HOST_HAS_TASKS]: 'workContextHasTasks',
    [HOST_IS_ACTIVE]: 'isActiveContext',
    [HOST_IS_HIDDEN]: 'isHidden',
    [HOST_VARIANT_NAV]: 'isVariantNav',
    [HOST_IS_COMPACT]: 'isCompact',
  },
  standalone: true,
})
export class NavItemInnerComponent {
  private readonly _store = inject(Store);

  // Mode selection
  mode = input<'work' | 'row'>('work');

  // Work context inputs
  workContext = input<WorkContextCommon | null>(null);
  type = input<WorkContextType | null>(null);
  defaultIcon = input<string>('folder_special');
  activeWorkContextId = input<string>('');

  // Variant styling to integrate into magic-side-nav without deep selectors
  variant = input<'default' | 'nav'>('default');
  compact = input<boolean>(false);
  showMoreButton = input<boolean>(true);

  // Presentational row inputs
  label = input<string | undefined>(undefined);
  icon = input<string | undefined>(undefined);
  svgIcon = input<string | undefined>(undefined);
  showLabels = input<boolean>(true);
  showChevron = input<boolean>(false);

  allUndoneTaskIds = toSignal(this._store.select(selectAllDoneIds), { initialValue: [] });
  nrOfOpenTasks = computed<number>(() => {
    const wc = this.workContext();
    if (!wc) return 0;
    const allUndoneTaskIds = this.allUndoneTaskIds();
    return wc.taskIds.filter((tid) => !allUndoneTaskIds.includes(tid)).length;
  });

  private readonly _routeBtn = viewChild('routeBtn', { read: ElementRef });

  get workContextHasTasks(): boolean {
    const wc = this.workContext();
    return !!wc && wc.taskIds.length > 0;
  }

  get isActiveContext(): boolean {
    const wc = this.workContext();
    return !!wc && wc.id === this.activeWorkContextId();
  }

  get isHidden(): boolean {
    const wc = this.workContext();
    return !!(wc as Project | null)?.isHiddenFromMenu;
  }

  get isVariantNav(): boolean {
    return this.variant() === 'nav';
  }

  get isCompact(): boolean {
    return this.compact();
  }

  focus(): void {
    const btn = this._routeBtn();
    if (btn) {
      btn.nativeElement.focus();
    }
  }
}
