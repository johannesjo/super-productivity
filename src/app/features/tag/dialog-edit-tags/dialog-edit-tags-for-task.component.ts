import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {T} from '../../../t.const';
import {TaskService} from '../../tasks/task.service';
import {DialogEditTagsForTaskPayload} from './dialog-edit-tags-for-task.payload';
import {truncate} from '../../../util/truncate';
import {TagService} from '../tag.service';
import {Task} from '../../tasks/task.model';
import {unique} from '../../../util/unique';

@Component({
  selector: 'dialog-edit-tags',
  templateUrl: './dialog-edit-tags-for-task.component.html',
  styleUrls: ['./dialog-edit-tags-for-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogEditTagsForTaskComponent {
  T = T;
  title: string = truncate(this.data.task.title, 20);
  task: Task = this.data.task;
  newTagIds: string[] = [...this.data.task.tagIds];
  isEdit = this.data.task.tagIds && this.data.task.tagIds.length > 0;

  tagSuggestions$ = this._tagService.tags$;

  constructor(
    private _taskService: TaskService,
    private _tagService: TagService,
    private _matDialogRef: MatDialogRef<DialogEditTagsForTaskComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogEditTagsForTaskPayload,
  ) {
  }

  save() {
    this._taskService.updateTags(this.data.task.id, this.newTagIds, this.data.task.tagIds);
    this.close();
  }

  close() {
    this._matDialogRef.close();
  }

  addTag(id: string) {
    this._updateTags(unique([...this.newTagIds, id]));
  }

  addNewTag(title: string) {
    const id = this._tagService.addTag({title});
    this._updateTags(unique([...this.newTagIds, id]));
  }

  removeTag(id: string) {
    const updatedTagIds = this.newTagIds.filter(tagId => tagId !== id);
    this._updateTags(updatedTagIds);
  }


  private _updateTags(newTagIds: string[]) {
    this._taskService.updateTags(this.task.id, newTagIds, this.task.tagIds);
  }
}
