import {ChangeDetectionStrategy, Component, Inject, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {T} from '../../../t.const';
import {TaskService} from '../../tasks/task.service';
import {DialogEditTagsForTaskPayload} from './dialog-edit-tags-for-task.payload';
import {truncate} from '../../../util/truncate';
import {TagService} from '../tag.service';
import {Task} from '../../tasks/task.model';
import {unique} from '../../../util/unique';
import {Observable, Subscription} from 'rxjs';

@Component({
  selector: 'dialog-edit-tags',
  templateUrl: './dialog-edit-tags-for-task.component.html',
  styleUrls: ['./dialog-edit-tags-for-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditTagsForTaskComponent implements OnDestroy {
  T = T;
  title: string = truncate(this.data.task.title, 20);
  task$: Observable<Task> = this._taskService.getByIdLive$(this.data.task.id);
  task: Task = this.data.task;
  tagIds: string[] = [...this.data.task.tagIds];
  isEdit = this.data.task.tagIds && this.data.task.tagIds.length > 0;
  tagSuggestions$ = this._tagService.tags$;

  private _subs = new Subscription();

  constructor(
    private _taskService: TaskService,
    private _tagService: TagService,
    private _matDialogRef: MatDialogRef<DialogEditTagsForTaskComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogEditTagsForTaskPayload,
  ) {
    this._subs.add(this.task$.subscribe(task => {
      this.tagIds = task.tagIds;
      this.task = task;
    }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  close() {
    this._matDialogRef.close();
  }

  addTag(id: string) {
    this._updateTags(unique([...this.tagIds, id]));
  }

  addNewTag(title: string) {
    const id = this._tagService.addTag({title});
    this._updateTags(unique([...this.tagIds, id]));
  }

  removeTag(id: string) {
    const updatedTagIds = this.tagIds.filter(tagId => tagId !== id);
    this._updateTags(updatedTagIds);
  }


  private _updateTags(newTagIds: string[]) {
    this._taskService.updateTags(this.task, unique(newTagIds), this.task.tagIds);
  }
}
