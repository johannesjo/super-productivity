import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Task } from '../../tasks/task.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfgCopy } from '../task-repeat-cfg.model';
import { Observable, Subscription } from 'rxjs';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormGroup } from '@angular/forms';
import {
  TASK_REPEAT_CFG_FORM_CFG_BASE,
  TASK_REPEAT_CFG_FORM_CFG_REPEAT,
} from './task-repeat-cfg-form.const';
import { T } from '../../../t.const';
import { TagService } from '../../tag/tag.service';
import { unique } from '../../../util/unique';
import { Tag } from '../../tag/tag.model';
import { exists } from '../../../util/exists';
import { TODAY_TAG } from '../../tag/tag.const';

// TASK_REPEAT_CFG_FORM_CFG
@Component({
  selector: 'dialog-edit-task-repeat-cfg',
  templateUrl: './dialog-edit-task-repeat-cfg.component.html',
  styleUrls: ['./dialog-edit-task-repeat-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogEditTaskRepeatCfgComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  task: Task = this.data.task;

  taskRepeatCfg: Omit<TaskRepeatCfgCopy, 'id'> = {
    ...DEFAULT_TASK_REPEAT_CFG,
    title: this.task.title,
    // NOTE: always add today tag, as that's likely what we want
    tagIds: unique([TODAY_TAG.id, ...this.task.tagIds]),
  };

  taskRepeatCfgInitial?: TaskRepeatCfgCopy;

  taskRepeatCfgId: string | null = this.task.repeatCfgId;
  isEdit: boolean = !!this.taskRepeatCfgId;

  TASK_REPEAT_CFG_FORM_CFG_BASE: FormlyFieldConfig[] = TASK_REPEAT_CFG_FORM_CFG_BASE;
  // TASK_REPEAT_CFG_FORM_CFG_BASE: FormlyFieldConfig[] = [];
  TASK_REPEAT_CFG_FORM_CFG_REPEAT: FormlyFieldConfig[] = TASK_REPEAT_CFG_FORM_CFG_REPEAT;

  form: FormGroup = new FormGroup({});
  tagSuggestions$: Observable<Tag[]> = this._tagService.tags$;

  private _subs: Subscription = new Subscription();

  constructor(
    private _tagService: TagService,
    private _cd: ChangeDetectorRef,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _matDialogRef: MatDialogRef<DialogEditTaskRepeatCfgComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
  ) {}

  ngOnInit(): void {
    if (this.isEdit && this.task.repeatCfgId) {
      this._subs.add(
        this._taskRepeatCfgService
          .getTaskRepeatCfgById$(this.task.repeatCfgId)
          .subscribe((cfg) => {
            this.taskRepeatCfg = cfg;
            this.taskRepeatCfgInitial = cfg;
            this._cd.detectChanges();
          }),
      );
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  save(): void {
    if (this.isEdit) {
      if (!this.taskRepeatCfgInitial) {
        throw new Error('Initial task repeat cfg missing (code error)');
      }
      const isRelevantChangesForUpdateAllTasks =
        this.taskRepeatCfgInitial.title !== this.taskRepeatCfg.title ||
        this.taskRepeatCfgInitial.defaultEstimate !==
          this.taskRepeatCfg.defaultEstimate ||
        this.taskRepeatCfgInitial.remindAt !== this.taskRepeatCfg.remindAt ||
        this.taskRepeatCfgInitial.startTime !== this.taskRepeatCfg.startTime ||
        JSON.stringify(this.taskRepeatCfgInitial.tagIds) !==
          JSON.stringify(this.taskRepeatCfg.tagIds);

      this._taskRepeatCfgService.updateTaskRepeatCfg(
        exists(this.taskRepeatCfgId),
        this.taskRepeatCfg,
        isRelevantChangesForUpdateAllTasks,
      );
      this.close();
    } else {
      this._taskRepeatCfgService.addTaskRepeatCfgToTask(
        this.task.id,
        this.task.projectId,
        this.taskRepeatCfg,
      );
      this.close();
    }
  }

  remove(): void {
    this._taskRepeatCfgService.deleteTaskRepeatCfgWithDialog(
      exists(this.task.repeatCfgId),
    );
    this.close();
  }

  close(): void {
    this._matDialogRef.close();
  }

  addTag(id: string): void {
    this._updateTags(unique([...this.taskRepeatCfg.tagIds, id]));
  }

  addNewTag(title: string): void {
    const id = this._tagService.addTag({ title });
    this._updateTags(unique([...this.taskRepeatCfg.tagIds, id]));
  }

  removeTag(id: string): void {
    const updatedTagIds = this.taskRepeatCfg.tagIds.filter((tagId) => tagId !== id);
    this._updateTags(updatedTagIds);
  }

  private _updateTags(newTagIds: string[]): void {
    this.taskRepeatCfg = {
      ...this.taskRepeatCfg,
      tagIds: newTagIds,
    };
  }
}
