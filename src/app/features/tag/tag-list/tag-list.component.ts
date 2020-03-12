import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {Tag} from '../tag.model';
import {TagService} from '../tag.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {MatDialog} from '@angular/material/dialog';
import {Task} from '../../tasks/task.model';
import {DialogEditTagsForTaskComponent} from '../dialog-edit-tags/dialog-edit-tags-for-task.component';

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
  }

  private _task: Task;

  @Output() addedTagsToTask: EventEmitter<string[]> = new EventEmitter();
  @Output() removedTagsFromTask: EventEmitter<string[]> = new EventEmitter();
  @Output() replacedTagForTask: EventEmitter<string[]> = new EventEmitter();

  private _tagIds$ = new BehaviorSubject([]);
  tags$: Observable<Tag[]> = this._tagIds$.pipe(
    switchMap((ids) => this._tagService.getTagsById$((ids))),
  );

  constructor(
    private readonly _tagService: TagService,
    private readonly _matDialog: MatDialog
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
