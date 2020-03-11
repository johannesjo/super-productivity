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
import {Tag, TagCopy} from '../tag.model';
import {TagService} from '../tag.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {switchMap, take} from 'rxjs/operators';
import {MatDialog} from '@angular/material/dialog';

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
  @Output() replacedTagForTask: EventEmitter<string[]> = new EventEmitter();

  @ViewChild('tagListEl', {static: true}) tagListEl;

  editingTag: undefined | Partial<TagCopy> = undefined;
  private _tagIds;
  private _tagIds$ = new BehaviorSubject([]);
  tags$: Observable<Tag[]> = this._tagIds$.pipe(
    switchMap((ids) => this._tagService.getTagsById$((ids))));

  newTag: Partial<TagCopy> = {
    title: '',
    color: '#FFDAB9'
  };


  constructor(
    private readonly _tagService: TagService,
    private readonly _matDialog: MatDialog
  ) {
  }


  ngOnInit(): void {
  }

  ngAfterViewInit(): void {

  }

  onTagEditKeydown($event: KeyboardEvent) {
    if ($event.key === 'Escape') {
      this.stopEditingTag();
    } else if ($event.key === 'Enter') {
      this.applyEdit();
      this.stopEditingTag();
      $event.preventDefault();
    }
  }

  applyEdit() {
    const oldTagId = this.editingTag.id;
    let newTagId: string;
    delete this.editingTag.id;

    this.tags$
      .pipe(take(1))
      .subscribe(tags => {
        if (tags.map(t => t.title).indexOf(this.editingTag.title) !== -1) {
          // TODO: Add proper feedback
          console.log('Error: The requested tag is already present on this task!');
        } else {
          this._tagService.getByName$(this.editingTag.title)
            .pipe(take(1))
            .subscribe(match => {

              if (match) {
                newTagId = match.id;
              } else {
                newTagId = this._tagService.addTag(this.editingTag);
              }

              if (oldTagId) {
                this.replacedTagForTask.emit([oldTagId, newTagId]);
              } else {
                this.addedTagsToTask.emit([newTagId]);
              }

            });
        }

        this.stopEditingTag();

      });

  }

  applyColorEdit() {
    const id = this.editingTag.id;
    const color = this.editingTag.color;
    if (id) {
      console.log(`Updating color to ${color}`);
      this._tagService.updateColor(id, color);
      this.stopEditingTag();
    }
  }

  stopEditingTag() {
    this.editingTag = undefined;
  }

  handleClickOnTag($event: MouseEvent, tag: Partial<Tag>) {
    if ($event.ctrlKey && tag.id) {
      this.removedTagsFromTask.emit([tag.id]);
    } else {
      // Clone tag (tags are immutable)
      this.editingTag = {title: tag.title, id: tag.id || undefined};
      if (tag.color) {
        this.editingTag.color = tag.color;
      }
    }
  }
}
