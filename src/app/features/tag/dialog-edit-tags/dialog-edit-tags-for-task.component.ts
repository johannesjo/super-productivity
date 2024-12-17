import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { TaskService } from '../../tasks/task.service';
import { DialogEditTagsForTaskPayload } from './dialog-edit-tags-for-task.payload';
import { truncate } from '../../../util/truncate';
import { TagService } from '../tag.service';
import { Task } from '../../tasks/task.model';
import { unique } from '../../../util/unique';
import { Observable, Subscription } from 'rxjs';
import { Tag } from '../tag.model';

@Component({
  selector: 'dialog-edit-tags',
  templateUrl: './dialog-edit-tags-for-task.component.html',
  styleUrls: ['./dialog-edit-tags-for-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogEditTagsForTaskComponent implements OnDestroy {
  T: typeof T = T;
  title: string = truncate(this.data.task.title, 20);
  task$: Observable<Task> = this._taskService.getByIdLive$(this.data.task.id);
  task: Task = this.data.task;
  tagIds: string[] = [...this.data.task.tagIds];
  isEdit: boolean = this.data.task.tagIds && this.data.task.tagIds.length > 0;
  tagSuggestions$: Observable<Tag[]> = this._tagService.tagsNoMyDayAndNoList$;

  private _subs: Subscription = new Subscription();

  constructor(
    private _taskService: TaskService,
    private _tagService: TagService,
    private _matDialogRef: MatDialogRef<DialogEditTagsForTaskComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogEditTagsForTaskPayload,
  ) {
    this._subs.add(
      this.task$.subscribe((task) => {
        this.tagIds = task.tagIds;
        this.task = task;
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  close(): void {
    this._matDialogRef.close();
  }

  addTag(id: string): void {
    this._updateTags(unique([...this.tagIds, id]));
  }

  addNewTag(title: string): void {
    const cleanTitle = (t: string): string => {
      return t.replace('#', '');
    };

    const id = this._tagService.addTag({ title: cleanTitle(title) });
    this._updateTags(unique([...this.tagIds, id]));
  }

  removeTag(id: string): void {
    const updatedTagIds = this.tagIds.filter((tagId) => tagId !== id);
    this._updateTags(updatedTagIds);
  }

  private _updateTags(newTagIds: string[]): void {
    this._taskService.updateTags(this.task, unique(newTagIds));
  }
}
