import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {Tag} from '../tag.model';
import {TagService} from '../tag.service';
import {BehaviorSubject, combineLatest, Observable, of, Subscription} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {MatDialog} from '@angular/material/dialog';
import {Task} from '../../tasks/task.model';
import {DialogEditTagsForTaskComponent} from '../dialog-edit-tags/dialog-edit-tags-for-task.component';
import {ProjectService} from '../../project/project.service';
import {WorkContextService} from '../../work-context/work-context.service';
import {Project} from '../../project/project.model';
import {WorkContextType} from '../../work-context/work-context.model';

@Component({
  selector: 'tag-list',
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class TagListComponent implements OnDestroy {
  @Input() set task(task: Task) {
    this._task = task;
    this._tagIds$.next(task.tagIds);
    this._projectId$.next(task.projectId);
  }

  @Input() set isShowProjectTagAlways(v: boolean) {
    this._isShowProjectTagAlways$.next(v);
  }

  private _isShowProjectTagAlways$ = new BehaviorSubject<boolean>(false);
  private _task: Task;

  @Output() addedTagsToTask: EventEmitter<string[]> = new EventEmitter();
  @Output() removedTagsFromTask: EventEmitter<string[]> = new EventEmitter();
  @Output() replacedTagForTask: EventEmitter<string[]> = new EventEmitter();


  private _projectId$ = new BehaviorSubject<string>(null);
  project$: Observable<Project> = combineLatest([
    this._workContextService.activeWorkContextTypeAndId$,
    this._isShowProjectTagAlways$
  ]).pipe(
    switchMap(([{activeType}, isShowAlways]) => isShowAlways || (activeType === WorkContextType.TAG)
      ? this._projectId$.pipe(
        switchMap(id => this._projectService.getByIdOnce$(id))
      )
      : of(null)
    ),
  );
  project: Project;


  private _tagIds$ = new BehaviorSubject([]);
  tags$: Observable<Tag[]> = combineLatest([
    this._tagIds$,
    this._workContextService.activeWorkContextId$,
  ]).pipe(
    // TODO there should be a better way...
    switchMap(([ids, activeId]) => this._tagService.getTagsByIds$((ids.filter(id => id !== activeId)))),
  );
  tags: Tag[];

  // NOTE: should normally be enough
  // private _hideId: string = this._workContextService.activeWorkContextId;
  private _subs = new Subscription();

  constructor(
    private readonly _tagService: TagService,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
    private readonly _matDialog: MatDialog,
  ) {
    this._subs.add(this.project$.subscribe(v => this.project = v));
    this._subs.add(this.tags$.subscribe(v => this.tags = v));
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
