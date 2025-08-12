import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  OnDestroy,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { T } from '../../t.const';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { Project } from '../../features/project/project.model';
import { MatDialog } from '@angular/material/dialog';
import { DRAG_DELAY_FOR_TOUCH_LONGER } from '../../app.constants';
import { Subscription } from 'rxjs';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { first } from 'rxjs/operators';
import { TagService } from '../../features/tag/tag.service';
import { Tag } from '../../features/tag/tag.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';
import { FocusKeyManager } from '@angular/cdk/a11y';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { TourId } from '../../features/shepherd/shepherd-steps.const';
import { ShepherdService } from '../../features/shepherd/shepherd.service';
import { getGithubErrorUrl } from '../../core/error-handler/global-error-handler.util';
import { IS_MOUSE_PRIMARY, IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { moveItemBeforeItem } from '../../util/move-item-before-item';
import { Store } from '@ngrx/store';
import {
  selectAllProjectsExceptInbox,
  selectUnarchivedHiddenProjectIds,
  selectUnarchivedVisibleProjects,
} from '../../features/project/store/project.selectors';
import { SideNavItemComponent } from './side-nav-item/side-nav-item.component';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { ContextMenuComponent } from '../../ui/context-menu/context-menu.component';
import { TranslatePipe } from '@ngx-translate/core';
import { AsyncPipe } from '@angular/common';
import { toggleHideFromMenu } from '../../features/project/store/project.actions';
import { PluginMenuComponent } from '../../plugins/ui/plugin-menu.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation],
  imports: [
    SideNavItemComponent,
    MatMenuItem,
    RouterLink,
    RouterLinkActive,
    MatIcon,
    MatIconButton,
    MatTooltip,
    ContextMenuComponent,
    CdkDropList,
    CdkDrag,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    TranslatePipe,
    AsyncPipe,
    PluginMenuComponent,
  ],
})
export class SideNavComponent implements OnDestroy {
  readonly tagService = inject(TagService);
  readonly projectService = inject(ProjectService);
  readonly workContextService = inject(WorkContextService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _layoutService = inject(LayoutService);
  private readonly _taskService = inject(TaskService);
  private readonly _shepherdService = inject(ShepherdService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _store = inject(Store);

  navEntries = viewChildren<MatMenuItem>('menuEntry');
  IS_MOUSE_PRIMARY = IS_MOUSE_PRIMARY;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  DRAG_DELAY_FOR_TOUCH_LONGER = DRAG_DELAY_FOR_TOUCH_LONGER;

  keyboardFocusTimeout?: number;
  projectExpandBtn = viewChild('projectExpandBtn', { read: ElementRef });
  isProjectsExpanded = signal(this.fetchProjectListState());

  allNonInboxProjects = toSignal(this._store.select(selectAllProjectsExceptInbox), {
    initialValue: [],
  });
  private _allVisibleProjects = toSignal(
    this._store.select(selectUnarchivedVisibleProjects),
    { initialValue: [] },
  );
  private _activeWorkContextId = toSignal(this.workContextService.activeWorkContextId$, {
    initialValue: null,
  });

  nonHiddenProjects = computed(() => {
    const isExpanded = this.isProjectsExpanded();
    const projects = this._allVisibleProjects();
    if (isExpanded) {
      return projects;
    }
    const activeId = this._activeWorkContextId();
    return projects.filter((p) => p.id === activeId);
  });

  tagExpandBtn = viewChild('tagExpandBtn', { read: ElementRef });
  isTagsExpanded = signal(this.fetchTagListState());

  private _tagListToDisplay = toSignal(this.tagService.tagsNoMyDayAndNoList$, {
    initialValue: [],
  });

  tagList = computed(() => {
    const isExpanded = this.isTagsExpanded();
    const tags = this._tagListToDisplay();
    if (isExpanded) {
      return tags;
    }
    const activeId = this._activeWorkContextId();
    return tags.filter((t) => t.id === activeId);
  });
  T: typeof T = T;
  activeWorkContextId?: string | null;
  WorkContextType: typeof WorkContextType = WorkContextType;
  TourId: typeof TourId = TourId;
  private keyManager?: FocusKeyManager<MatMenuItem>;
  private _subs: Subscription = new Subscription();
  private _cachedIssueUrl?: string;

  @HostBinding('class') get cssClass(): string {
    return this._globalConfigService.cfg()?.misc.isUseMinimalNav ? 'minimal-nav' : '';
  }

  constructor() {
    this._subs.add(
      this.workContextService.activeWorkContextId$.subscribe(
        (id) => (this.activeWorkContextId = id),
      ),
    );

    // Effect to handle side nav visibility changes
    effect(() => {
      const isShow = this._layoutService.isShowSideNav();
      const navEntries = this.navEntries();
      if (navEntries && isShow) {
        this.keyManager = new FocusKeyManager<MatMenuItem>(
          navEntries,
        ).withVerticalOrientation(true);
        window.clearTimeout(this.keyboardFocusTimeout);
        this.keyboardFocusTimeout = window.setTimeout(() => {
          this.keyManager?.setFirstItemActive();
        }, 100);
        // this.keyManager.change.subscribe((v) => Log.log('this.keyManager.change', v));
      } else if (!isShow) {
        this._taskService.focusFirstTaskIfVisible();
      }
    });
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    this.keyManager?.onKeydown(event);
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    window.clearTimeout(this.keyboardFocusTimeout);
  }

  addProject(): void {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  fetchProjectListState(): boolean {
    return localStorage.getItem(LS.IS_PROJECT_LIST_EXPANDED) === 'true';
  }

  private _storeProjectListState(isExpanded: boolean): void {
    this.isProjectsExpanded.set(isExpanded);
    localStorage.setItem(LS.IS_PROJECT_LIST_EXPANDED, isExpanded.toString());
  }

  fetchTagListState(): boolean {
    return localStorage.getItem(LS.IS_TAG_LIST_EXPANDED) === 'true';
  }

  storeTagListState(isExpanded: boolean): void {
    this.isTagsExpanded.set(isExpanded);
    localStorage.setItem(LS.IS_TAG_LIST_EXPANDED, isExpanded.toString());
  }

  toggleExpandProjects(): void {
    const newState: boolean = !this.isProjectsExpanded();
    this._storeProjectListState(newState);
  }

  toggleExpandProjectsLeftRight(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.isProjectsExpanded()) {
      this._storeProjectListState(false);
    } else if (ev.key === 'ArrowRight' && !this.isProjectsExpanded()) {
      this._storeProjectListState(true);
    }
  }

  checkFocusProject(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.projectExpandBtn()?.nativeElement) {
      const targetIndex = this.navEntries().findIndex((value) => {
        return (
          typeof value._getHostElement === 'function' &&
          value._getHostElement() === this.projectExpandBtn()?.nativeElement
        );
      });

      if (targetIndex) {
        this.keyManager?.setActiveItem(targetIndex);
      }
    }
  }

  toggleExpandTags(): void {
    const newState: boolean = !this.isTagsExpanded();
    this.storeTagListState(newState);
  }

  toggleExpandTagsLeftRight(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.isTagsExpanded()) {
      this.storeTagListState(false);
    } else if (ev.key === 'ArrowRight' && !this.isTagsExpanded()) {
      this.storeTagListState(true);
    }
  }

  checkFocusTag(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.tagExpandBtn()?.nativeElement) {
      const targetIndex = this.navEntries().findIndex((value) => {
        return (
          typeof value._getHostElement === 'function' &&
          value._getHostElement() === this.tagExpandBtn()?.nativeElement
        );
      });

      if (targetIndex) {
        this.keyManager?.setActiveItem(targetIndex);
      }
    }
  }

  startTour(id: TourId): void {
    this._shepherdService.show(id);
  }

  getGithubErrorUrl(): string {
    if (!this._cachedIssueUrl) {
      this._cachedIssueUrl = getGithubErrorUrl('', undefined, true);
    }
    return this._cachedIssueUrl;
  }

  toggleProjectVisibility(project: Project): void {
    this._store.dispatch(toggleHideFromMenu({ id: project.id }));
  }

  async dropOnProjectList(
    allItems: Project[],
    ev: CdkDragDrop<string, string, Project>,
  ): Promise<void> {
    if (ev.previousContainer === ev.container && ev.currentIndex !== ev.previousIndex) {
      const tag = ev.item.data;
      const allIds = allItems.map((p) => p.id);
      const targetTagId = allIds[ev.currentIndex] as string;
      if (targetTagId) {
        const hiddenIds = await this._store
          .select(selectUnarchivedHiddenProjectIds)
          .pipe(first())
          .toPromise();
        const newIds = [...moveItemBeforeItem(allIds, tag.id, targetTagId), ...hiddenIds];
        this.projectService.updateOrder(newIds);
      }
    }
  }

  dropOnTagList(allItems: Tag[], ev: CdkDragDrop<string, string, Tag>): void {
    if (ev.previousContainer === ev.container && ev.currentIndex !== ev.previousIndex) {
      const tag = ev.item.data;
      const allIds = allItems.map((p) => p.id);
      const targetTagId = allIds[ev.currentIndex] as string;
      if (targetTagId) {
        // special today list should always be first
        const newIds = [TODAY_TAG.id, ...moveItemBeforeItem(allIds, tag.id, targetTagId)];
        this.tagService.updateOrder(newIds);
      }
    }
  }
}
