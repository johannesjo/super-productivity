import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { T } from '../../t.const';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { Project } from '../../features/project/project.model';
import { MatDialog } from '@angular/material/dialog';
import { THEME_COLOR_MAP } from '../../app.constants';
import { DragulaService } from 'ng2-dragula';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { map, switchMap } from 'rxjs/operators';
import { TagService } from '../../features/tag/tag.service';
import { Tag } from '../../features/tag/tag.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';
import { FocusKeyManager } from '@angular/cdk/a11y';
import { MatMenuItem } from '@angular/material/menu';
import { LayoutService } from '../layout/layout.service';
import { TaskService } from '../../features/tasks/task.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { DialogTimelineSetupComponent } from '../../features/schedule/dialog-timeline-setup/dialog-timeline-setup.component';
import { TourId } from '../../features/shepherd/shepherd-steps.const';
import { ShepherdService } from '../../features/shepherd/shepherd.service';
import { getGithubErrorUrl } from 'src/app/core/error-handler/global-error-handler.util';
import { IS_MOUSE_PRIMARY } from '../../util/is-mouse-primary';
import { GlobalConfigService } from '../../features/config/global-config.service';

@Component({
  selector: 'side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation],
})
export class SideNavComponent implements OnDestroy {
  @ViewChildren('menuEntry') navEntries?: QueryList<MatMenuItem>;
  IS_MOUSE_PRIMARY = IS_MOUSE_PRIMARY;
  keyboardFocusTimeout?: number;
  @ViewChild('projectExpandBtn', { read: ElementRef }) projectExpandBtn?: ElementRef;
  isProjectsExpanded: boolean = this.fetchProjectListState();
  isProjectsExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    this.isProjectsExpanded,
  );
  projectList$: Observable<Project[]> = this.isProjectsExpanded$.pipe(
    switchMap((isExpanded) =>
      isExpanded
        ? this.projectService.list$
        : combineLatest([
            this.projectService.list$,
            this.workContextService.activeWorkContextId$,
          ]).pipe(map(([projects, id]) => projects.filter((p) => p.id === id))),
    ),
  );
  @ViewChild('tagExpandBtn', { read: ElementRef }) tagExpandBtn?: ElementRef;
  isTagsExpanded: boolean = this.fetchTagListState();
  isTagsExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    this.isTagsExpanded,
  );
  tagList$: Observable<Tag[]> = this.isTagsExpanded$.pipe(
    switchMap((isExpanded) =>
      isExpanded
        ? this.tagService.tagsNoMyDayAndNoList$
        : combineLatest([
            this.tagService.tagsNoMyDayAndNoList$,
            this.workContextService.activeWorkContextId$,
          ]).pipe(map(([tags, id]) => tags.filter((t) => t.id === id))),
    ),
  );
  T: typeof T = T;
  readonly PROJECTS_SIDE_NAV: string = 'PROJECTS_SIDE_NAV';
  readonly TAG_SIDE_NAV: string = 'TAG_SIDE_NAV';
  activeWorkContextId?: string | null;
  WorkContextType: typeof WorkContextType = WorkContextType;
  TourId: typeof TourId = TourId;
  private keyManager?: FocusKeyManager<MatMenuItem>;
  private _subs: Subscription = new Subscription();
  private _cachedIssueUrl?: string;

  @HostBinding('class') get cssClass(): string {
    return this._globalConfigService.cfg?.misc.isUseMinimalNav ? 'minimal-nav' : '';
  }

  constructor(
    public readonly tagService: TagService,
    public readonly projectService: ProjectService,
    public readonly workContextService: WorkContextService,
    private readonly _matDialog: MatDialog,
    private readonly _layoutService: LayoutService,
    private readonly _taskService: TaskService,
    private readonly _dragulaService: DragulaService,
    private readonly _shepherdService: ShepherdService,
    private readonly _globalConfigService: GlobalConfigService,
  ) {
    this._dragulaService.createGroup(this.PROJECTS_SIDE_NAV, {
      direction: 'vertical',
      moves: (el, container, handle) => {
        return (
          this.isProjectsExpanded &&
          !!handle &&
          handle.className.indexOf &&
          handle.className.indexOf('drag-handle') > -1
        );
      },
    });
    this._dragulaService.createGroup(this.TAG_SIDE_NAV, {
      direction: 'vertical',
      moves: (el, container, handle) => {
        return (
          this.isTagsExpanded &&
          !!handle &&
          handle.className.indexOf &&
          handle.className.indexOf('drag-handle') > -1
        );
      },
    });

    this._subs.add(
      this.workContextService.activeWorkContextId$.subscribe(
        (id) => (this.activeWorkContextId = id),
      ),
    );

    this._subs.add(
      this._dragulaService
        .dropModel(this.PROJECTS_SIDE_NAV)
        .subscribe(({ targetModel }) => {
          // const {target, source, targetModel, item} = params;
          const targetNewIds = targetModel.map((project: Project) => project.id);
          this.projectService.updateOrder(targetNewIds);
        }),
    );

    this._subs.add(
      this._dragulaService.dropModel(this.TAG_SIDE_NAV).subscribe(({ targetModel }) => {
        // const {target, source, targetModel, item} = params;
        const targetNewIds = targetModel.map((project: Project) => project.id);
        // NOTE: the today tag is filtered out, that's why we re-add here
        this.tagService.updateOrder([TODAY_TAG.id, ...targetNewIds]);
      }),
    );

    this._subs.add(
      this._layoutService.isShowSideNav$.subscribe((isShow) => {
        if (this.navEntries && isShow) {
          this.keyManager = new FocusKeyManager<MatMenuItem>(
            this.navEntries,
          ).withVerticalOrientation(true);
          window.clearTimeout(this.keyboardFocusTimeout);
          this.keyboardFocusTimeout = window.setTimeout(() => {
            this.keyManager?.setFirstItemActive();
          }, 100);
          // this.keyManager.change.subscribe((v) => console.log('this.keyManager.change', v));
        } else if (!isShow) {
          this._taskService.focusFirstTaskIfVisible();
        }
      }),
    );
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    this.keyManager?.onKeydown(event);
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    this._dragulaService.destroy(this.PROJECTS_SIDE_NAV);
    this._dragulaService.destroy(this.TAG_SIDE_NAV);
    window.clearTimeout(this.keyboardFocusTimeout);
  }

  addProject(): void {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  trackById(i: number, project: Project | Tag): string {
    return project.id;
  }

  getThemeColor(color: THEME_COLOR_MAP | string): { [key: string]: string } {
    const standardColor = (THEME_COLOR_MAP as any)[color];
    const colorToUse = standardColor ? standardColor : color;
    return { background: colorToUse };
  }

  fetchProjectListState(): boolean {
    return localStorage.getItem(LS.IS_PROJECT_LIST_EXPANDED) === 'true';
  }

  storeProjectListState(isExpanded: boolean): void {
    this.isProjectsExpanded = isExpanded;
    localStorage.setItem(LS.IS_PROJECT_LIST_EXPANDED, isExpanded.toString());
  }

  fetchTagListState(): boolean {
    return localStorage.getItem(LS.IS_TAG_LIST_EXPANDED) === 'true';
  }

  storeTagListState(isExpanded: boolean): void {
    this.isTagsExpanded = isExpanded;
    localStorage.setItem(LS.IS_TAG_LIST_EXPANDED, isExpanded.toString());
  }

  toggleExpandProjects(): void {
    const newState: boolean = !this.isProjectsExpanded;
    this.storeProjectListState(newState);
    this.isProjectsExpanded$.next(newState);
  }

  toggleExpandProjectsLeftRight(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.isProjectsExpanded) {
      this.storeProjectListState(false);
      this.isProjectsExpanded$.next(this.isProjectsExpanded);
    } else if (ev.key === 'ArrowRight' && !this.isProjectsExpanded) {
      this.storeProjectListState(true);
      this.isProjectsExpanded$.next(this.isProjectsExpanded);
    }
  }

  checkFocusProject(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.projectExpandBtn?.nativeElement) {
      const targetIndex = this.navEntries?.toArray().findIndex((value) => {
        return value._getHostElement() === this.projectExpandBtn?.nativeElement;
      });
      if (targetIndex) {
        this.keyManager?.setActiveItem(targetIndex);
      }
    }
  }

  toggleExpandTags(): void {
    const newState: boolean = !this.isTagsExpanded;
    this.storeTagListState(newState);
    this.isTagsExpanded$.next(newState);
  }

  toggleExpandTagsLeftRight(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.isTagsExpanded) {
      this.storeTagListState(false);
      this.isTagsExpanded$.next(this.isTagsExpanded);
    } else if (ev.key === 'ArrowRight' && !this.isTagsExpanded) {
      this.storeTagListState(true);
      this.isTagsExpanded$.next(this.isTagsExpanded);
    }
  }

  checkFocusTag(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' && this.tagExpandBtn?.nativeElement) {
      const targetIndex = this.navEntries?.toArray().findIndex((value) => {
        return value._getHostElement() === this.tagExpandBtn?.nativeElement;
      });
      if (targetIndex) {
        this.keyManager?.setActiveItem(targetIndex);
      }
    }
  }

  openTimelineSettings(): void {
    this._matDialog.open(DialogTimelineSetupComponent);
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
}
