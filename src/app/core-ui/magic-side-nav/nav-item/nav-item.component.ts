import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
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
import { MatMenuItem, MatMenuModule } from '@angular/material/menu';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAllDoneIds } from '../../../features/tasks/store/task.selectors';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'nav-item',
  imports: [
    RouterLink,
    RouterModule,
    WorkContextMenuComponent,
    ContextMenuComponent,
    CdkDragPlaceholder,
    MatIconButton,
    MatIcon,
    MatMenuItem,
    MatMenuModule,
    TranslatePipe,
  ],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'g-multi-btn-wrapper',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.hasTasks]': 'workContextHasTasks()',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isActiveContext]': 'isActiveContext()',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isHidden]': 'isHidden()',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.variant-nav]': "variant() === 'nav'",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.compact]': 'compact()',
  },
  standalone: true,
})
export class NavItemComponent {
  private readonly _store = inject(Store);

  // Mode selection
  mode = input<'work' | 'row'>('work');

  // Container selection for non-work modes
  container = input<'route' | 'href' | 'action' | 'group' | null>(null);
  navRoute = input<string | any[] | undefined>(undefined);
  navHref = input<string | undefined>(undefined);
  expanded = input<boolean>(false);
  ariaControls = input<string | null>(null);

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
  // Optional: menu trigger for dropdown
  menuTriggerFor = input<any | null>(null);

  // Events
  // Common row class for compact/default variants
  readonly rowClass = computed(() => (this.compact() ? 'nav-child-link' : 'nav-link'));
  clicked = output<void>();

  allUndoneTaskIds = toSignal(this._store.select(selectAllDoneIds), { initialValue: [] });
  nrOfOpenTasks = computed<number>(() => {
    const wc = this.workContext();
    if (!wc) return 0;
    const allUndoneTaskIds = this.allUndoneTaskIds();
    return wc.taskIds.filter((tid) => !allUndoneTaskIds.includes(tid)).length;
  });

  private readonly _routeBtn = viewChild('routeBtn', { read: ElementRef });

  workContextHasTasks = computed<boolean>(() => {
    const wc = this.workContext();
    return !!wc && wc.taskIds.length > 0;
  });

  isActiveContext = computed<boolean>(() => {
    const wc = this.workContext();
    return !!wc && wc.id === this.activeWorkContextId();
  });

  isHidden = computed<boolean>(() => {
    const wc = this.workContext();
    return !!(wc as Project | null)?.isHiddenFromMenu;
  });

  // removed redundant computed flags: use inputs directly in host bindings

  focus(): void {
    const btn = this._routeBtn();
    if (btn) {
      btn.nativeElement.focus();
    }
  }
}
