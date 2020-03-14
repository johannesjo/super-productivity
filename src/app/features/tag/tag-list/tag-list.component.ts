import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {Tag} from '../tag.model';
import {TagService} from '../tag.service';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
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
export class TagListComponent {
  @Input() set task(task: Task) {
    this._task = task;
    this._tagIds$.next(task.tagIds);
    this._projectId$.next(task.projectId);
  }

  private _task: Task;

  @Output() addedTagsToTask: EventEmitter<string[]> = new EventEmitter();
  @Output() removedTagsFromTask: EventEmitter<string[]> = new EventEmitter();
  @Output() replacedTagForTask: EventEmitter<string[]> = new EventEmitter();


  private _projectId$ = new BehaviorSubject<string>(null);
  project$: Observable<Project> = this._workContextService.activeWorkContextTypeAndId$.pipe(
    switchMap(({activeType}) => (activeType === WorkContextType.TAG)
      ? this._projectId$.pipe(
        switchMap(id => this._projectService.getById$(id))
      )
      : of(null)
    ),
  );


  private _tagIds$ = new BehaviorSubject([]);
  tags$: Observable<Tag[]> = combineLatest([
    this._tagIds$,
    this._workContextService.activeWorkContextId$,
  ]).pipe(
    // TODO there should be a better way...
    switchMap(([ids, activeId]) => this._tagService.getTagsById$((ids.filter(id => id !== activeId)))),
  );

  // NOTE: should normally be enough
  // private _hideId: string = this._workContextService.activeWorkContextId;

  constructor(
    private readonly _tagService: TagService,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
    private readonly _matDialog: MatDialog,
  ) {
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
