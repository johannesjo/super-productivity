import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {Tag} from '../tag.model';
import {TagService} from '../tag.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'tag-list',
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class TagListComponent {
  @Input() set tagIds(val: string[]) {
    this._tagIds$.next(val);
  }

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

  }
}
