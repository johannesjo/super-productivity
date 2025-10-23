import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ElementRef,
} from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';

import {
  WorkContextCommon,
  WorkContextType,
} from '../../../features/work-context/work-context.model';
import { Project } from '../../../features/project/project.model';
import { DEFAULT_PROJECT_ICON } from '../../../features/project/project.const';
import { WorkContextMenuComponent } from '../../work-context-menu/work-context-menu.component';
import { FolderContextMenuComponent } from '../../folder-context-menu/folder-context-menu.component';
import { ContextMenuComponent } from '../../../ui/context-menu/context-menu.component';
import { CdkDragPlaceholder, DragDropRegistry } from '@angular/cdk/drag-drop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuItem, MatMenuModule } from '@angular/material/menu';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAllDoneIds } from '../../../features/tasks/store/task.selectors';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { isSingleEmoji } from '../../../util/extract-first-emoji';
import { MenuTreeKind } from '../../../features/menu-tree/store/menu-tree.model';
import { Subscription } from 'rxjs';
import { ScheduleExternalDragService } from '../../../features/schedule/schedule-week/schedule-external-drag.service';
import { Log } from '../../../core/log';
import { TODAY_TAG } from 'src/app/features/tag/tag.const';
import { TaskService } from 'src/app/features/tasks/task.service';

@Component({
  selector: 'nav-item',
  imports: [
    RouterLink,
    RouterModule,
    WorkContextMenuComponent,
    FolderContextMenuComponent,
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
  },
  standalone: true,
})
export class NavItemComponent implements AfterViewInit, OnDestroy {
  private readonly _store = inject(Store);
  private _dragDropRegistry = inject(DragDropRegistry);
  private _ngZone = inject(NgZone);
  private _externalDragService = inject(ScheduleExternalDragService);
  private _pointerUpSubscription: Subscription | null = null;
  private _elementRef = inject(ElementRef);
  private _taskService = inject(TaskService);

  mode = input<'work' | 'folder' | 'row'>('work');
  variant = input<'default' | 'nav'>('default');
  container = input<'route' | 'href' | 'action' | 'group' | null>(null);

  navRoute = input<string | any[] | undefined>(undefined);
  navHref = input<string | undefined>(undefined);
  expanded = input<boolean>(false);

  ariaControls = input<string | null>(null);
  // Work context inputs
  workContext = input<WorkContextCommon | null>(null);
  type = input<WorkContextType | null>(null);
  defaultIcon = input<string>(DEFAULT_PROJECT_ICON);

  activeWorkContextId = input<string>('');
  // Folder inputs

  folderId = input<string | null>(null);
  treeKind = input<MenuTreeKind>(MenuTreeKind.PROJECT);
  // Variant styling to integrate into magic-side-nav without deep selectors
  showMoreButton = input<boolean>(true);

  // Presentational row inputs
  label = input<string | undefined>(undefined);
  icon = input<string | undefined>(undefined);
  svgIcon = input<string | undefined>(undefined);
  showLabels = input<boolean>(true);
  // Optional: menu trigger for dropdown
  menuTriggerFor = input<any | null>(null);

  // Tour class for Shepherd.js guide
  tourClass = input<string | null>(null);

  // Events
  clicked = output<void>();

  private readonly _allUndoneTaskIds = toSignal(this._store.select(selectAllDoneIds), {
    initialValue: [],
  });

  // Memoized computation for better performance
  nrOfOpenTasks = computed<number>(() => {
    const wc = this.workContext();
    if (!wc || wc.taskIds.length === 0) return 0;

    const allUndoneTaskIds = this._allUndoneTaskIds();
    const undoneTaskCount = wc.taskIds.filter(
      (tid) => !allUndoneTaskIds.includes(tid),
    ).length;
    return undoneTaskCount;
  });

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

  // Emoji detection for work context icons
  isWorkContextEmojiIcon = computed<boolean>(() => {
    const wc = this.workContext();
    if (!wc) return false;
    const icon = wc.icon || this.defaultIcon();
    return isSingleEmoji(icon);
  });

  // Emoji detection for presentational icons
  isPresentationalEmojiIcon = computed<boolean>(() => {
    const iconValue = this.icon();
    return iconValue ? isSingleEmoji(iconValue) : false;
  });

  ngAfterViewInit(): void {
    // Listen for global pointer releases while a drag is active
    this._pointerUpSubscription = this._dragDropRegistry.pointerUp.subscribe((event) => {
      this._ngZone.run(() => this._handlePointerUp(event));
    });
  }

  ngOnDestroy(): void {
    if (this._pointerUpSubscription) {
      this._pointerUpSubscription.unsubscribe();
      this._pointerUpSubscription = null;
    }
  }

  private _handlePointerUp(event: MouseEvent | TouchEvent): void {
    const draggedTask = this._externalDragService.activeTask();

    // exclude subtasks and recurring tasks
    if (!draggedTask || draggedTask.parentId || draggedTask.repeatCfgId) {
      return;
    }

    if (this._isEventInsideElement(event)) {
      if (this.type() === WorkContextType.PROJECT) {
        // Task is dropped in a project
        const projectId = this.workContext()?.id;
        Log.debug('Task dropped on Project', { draggedTask, projectId });
        this._taskService.moveToProject(draggedTask, projectId!);
      } else if (this.type() === WorkContextType.TAG) {
        // Task is dropped on a tag
        const tagId = this.workContext()?.id;
        Log.debug('Task dropped on Tag', { draggedTask, tagId });

        // Special case: "Today" tag means to schedule task for today
        if (tagId === TODAY_TAG.id) {
          this._taskService.addToToday(draggedTask);
        } else {
          if (!draggedTask.tagIds.includes(tagId!)) {
            // tag not yet assigned to task, add it
            this._taskService.updateTags(draggedTask, [...draggedTask.tagIds, tagId!]);
          } else {
            // tag already assigned to task, remove it
            this._taskService.updateTags(
              draggedTask,
              draggedTask.tagIds.filter((t) => t !== tagId),
            );
          }
        }
      }
    }
  }

  private _getPointerPosition(
    event: MouseEvent | TouchEvent,
  ): { x: number; y: number } | null {
    if (!('touches' in event)) {
      return { x: event.clientX, y: event.clientY };
    }

    const touch = event.touches[0] ?? event.changedTouches?.[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  private _isEventInsideElement(event: MouseEvent | TouchEvent): boolean {
    const pointer = this._getPointerPosition(event);
    const rect = this._elementRef.nativeElement.getBoundingClientRect();

    return (
      pointer != null &&
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom
    );
  }
}
