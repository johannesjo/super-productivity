import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { Tag } from '../tag.model';
import { TagService } from '../tag.service';
import { BehaviorSubject, combineLatest, Observable, of, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Task } from '../../tasks/task.model';
import { DialogEditTagsForTaskComponent } from '../dialog-edit-tags/dialog-edit-tags-for-task.component';
import { ProjectService } from '../../project/project.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { TagComponentTag } from '../tag/tag.component';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';

@Component({
  selector: 'tag-list',
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation]
})
export class TagListComponent implements OnDestroy {
  @Input() isDisableEdit: boolean = false;
  @Output() addedTagsToTask: EventEmitter<string[]> = new EventEmitter();
  @Output() removedTagsFromTask: EventEmitter<string[]> = new EventEmitter();
  @Output() replacedTagForTask: EventEmitter<string[]> = new EventEmitter();
  projectTag?: TagComponentTag | null;
  tags: Tag[] = [];
  private _isShowProjectTagAlways$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _projectId$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  projectTag$: Observable<TagComponentTag | null> = combineLatest([
    this._workContextService.activeWorkContextTypeAndId$,
    this._isShowProjectTagAlways$
  ]).pipe(
    switchMap(([{activeType}, isShowAlways]) => isShowAlways || (activeType === WorkContextType.TAG)
      ? this._projectId$.pipe(
        switchMap(id => id
          ? this._projectService.getByIdOnce$(id)
          : of(null)
        ),
        map(project => (project && {
          ...project,
          icon: 'list'
        }))
      )
      : of(null)
    ),
  );
  private _tagIds$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  tags$: Observable<Tag[]> = combineLatest([
    this._tagIds$,
    this._workContextService.activeWorkContextId$,
  ]).pipe(
    // TODO there should be a better way...
    switchMap(([ids, activeId]) =>
      this._tagService.getTagsByIds$(ids.filter(id => id !== activeId), true)
    ),
  );
  // private _hideId: string = this._workContextService.activeWorkContextId;
  private _subs: Subscription = new Subscription();

  constructor(
    private readonly _tagService: TagService,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
    private readonly _matDialog: MatDialog,
  ) {
    this._subs.add(this.projectTag$.subscribe(v => this.projectTag = v));
    this._subs.add(this.tags$.subscribe(v => this.tags = v));
  }

  @Input() set isShowProjectTagAlways(v: boolean) {
    this._isShowProjectTagAlways$.next(v);
  }

  // NOTE: should normally be enough

  private _task?: Task;

  @Input() set task(task: Task) {
    this._task = task;
    this._tagIds$.next(task.tagIds);
    this._projectId$.next(task.projectId);
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  editTags() {
    this._matDialog.open(DialogEditTagsForTaskComponent, {
      restoreFocus: true,
      data: {
        task: this._task,
      },
    });
  }

  trackByFn(i: number, tag: Tag) {
    return tag
      ? tag.id
      : i;
  }
}
