import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {MatDialog} from '@angular/material';
import {Tag} from '../tag.model';
import {TagService} from '../tag.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {first, subscribeOn, switchMap} from 'rxjs/operators';

@Component({
  selector: 'tag-list',
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class TagListComponent implements OnInit, AfterViewInit {
  @Input() set tagIds(val: string[]) {
    this._tagIds = val;
    this._tagIds$.next(this._tagIds);
  }
  @Output() addedTagsToTask: EventEmitter<string[]> = new EventEmitter();
  @Output() removedTagsFromTask: EventEmitter<string[]> = new EventEmitter();

  @ViewChild('newTagInputEl', {static: true}) newTagInputEl;

  counter = 0;
  editingNewTag = false;
  newTag = '';
  private _tagIds;
  private _tagIds$ = new BehaviorSubject([]);
  tags$: Observable<Tag[]> = this._tagIds$.pipe(
    switchMap((ids) => this._tagService.getByIds$((ids))));


  constructor(
    public readonly _tagService: TagService,
    private readonly _matDialog: MatDialog
  ) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.newTagInputEl.nativeElement.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          this.resetNewTagEdit();
        } else if (ev.key === 'Enter') {
          this.addTagToTask(this.newTag);
          this.resetNewTagEdit();
          ev.preventDefault();
        }
      });
    });

  }

  addTagToTask($event: string) {
    console.log('adding tag...');
    const subscription = this._tagService.getByName$($event).subscribe(tag => {
      console.log(tag);
      if ( tag ) {
        // TODO: Show proper error message
        console.error('ERROR: A tag with that name already exists!');
        return;
      }
      console.log('Adding tag...');
      const tagId = this._tagService.addTag({name: $event});
      this.addedTagsToTask.emit([tagId]);
    });
  }

  resetNewTagEdit() {
    this.newTag = '';
    this.editingNewTag = false;
  }

  removeTagFromTask($event: string) {
    this.removedTagsFromTask.emit([$event]);
  }

  startEditNewTag() {
    this.editingNewTag = true;
    this.newTagInputEl.nativeElement.focus();
  }

}
