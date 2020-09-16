import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, Output } from '@angular/core';
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

@Component({
  selector: 'side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation],
})
export class SideNavComponent implements OnDestroy {
  @Output() scrollToNotes: EventEmitter<void> = new EventEmitter();

  isProjectsExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isProjectsExpanded: boolean = false;
  projectList$: Observable<Project[]> = this.isProjectsExpanded$.pipe(
    switchMap(isExpanded => isExpanded
      ? this.projectService.list$
      : combineLatest([
        this.projectService.list$,
        this.workContextService.activeWorkContextId$
      ]).pipe(
        map(([projects, id]) => projects.filter(p => p.id === id))
      )
    )
  );

  isTagsExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isTagsExpanded: boolean = false;
  tagList$: Observable<Tag[]> = this.isTagsExpanded$.pipe(
    switchMap(isExpanded => isExpanded
      ? this.tagService.tagsNoMyDay$
      : combineLatest([
        this.tagService.tagsNoMyDay$,
        this.workContextService.activeWorkContextId$
      ]).pipe(
        map(([tags, id]) => tags.filter(t => t.id === id))
      )
    )
  );

  T: typeof T = T;
  readonly PROJECTS_SIDE_NAV: string = 'PROJECTS_SIDE_NAV';
  readonly TAG_SIDE_NAV: string = 'TAG_SIDE_NAV';
  activeWorkContextId?: string | null;
  WorkContextType: typeof WorkContextType = WorkContextType;

  private _subs: Subscription = new Subscription();

  constructor(
    public readonly tagService: TagService,
    public readonly projectService: ProjectService,
    public readonly workContextService: WorkContextService,
    private readonly _matDialog: MatDialog,
    private readonly _dragulaService: DragulaService,
  ) {
    this._dragulaService.createGroup(this.PROJECTS_SIDE_NAV, {
      direction: 'vertical',
      moves: (el, container, handle) => {
        return this.isProjectsExpanded && !!handle && handle.className.indexOf && handle.className.indexOf('drag-handle') > -1;
      }
    });
    this._subs.add(this.workContextService.activeWorkContextId$.subscribe(id => this.activeWorkContextId = id));

    this._subs.add(this._dragulaService.dropModel(this.PROJECTS_SIDE_NAV)
      .subscribe(({targetModel}) => {
        // const {target, source, targetModel, item} = params;
        const targetNewIds = targetModel.map((project: Project) => project.id);
        this.projectService.updateOrder(targetNewIds);
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    this._dragulaService.destroy(this.PROJECTS_SIDE_NAV);
    this._dragulaService.destroy(this.TAG_SIDE_NAV);
  }

  addProject() {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  trackById(i: number, project: Project) {
    return project.id;
  }

  getThemeColor(color: THEME_COLOR_MAP | string): { [key: string]: string } {
    const standardColor = (THEME_COLOR_MAP as any)[color];
    const colorToUse = (standardColor)
      ? standardColor
      : color;
    return {background: colorToUse};
  }

  onScrollToNotesClick() {
    this.scrollToNotes.emit();
  }

  toggleExpandProjects() {
    this.isProjectsExpanded = !this.isProjectsExpanded;
    this.isProjectsExpanded$.next(this.isProjectsExpanded);
  }

  toggleExpandTags() {
    this.isTagsExpanded = !this.isTagsExpanded;
    this.isTagsExpanded$.next(this.isTagsExpanded);
  }

  // addTag() {
  // }
  //
  // switchTag(a, b) {
  //
  // }
}
