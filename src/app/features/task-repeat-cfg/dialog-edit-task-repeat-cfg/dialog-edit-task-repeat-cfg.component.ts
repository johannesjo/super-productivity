import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  LOCALE_ID,
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
import { TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS } from './task-repeat-cfg-form.const';
import { T } from '../../../t.const';
import { TagService } from '../../tag/tag.service';
import { unique } from '../../../util/unique';
import { Tag } from '../../tag/tag.model';
import { exists } from '../../../util/exists';
import { TODAY_TAG } from '../../tag/tag.const';
import { TranslateService } from '@ngx-translate/core';

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

  TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS: FormlyFieldConfig[];

  form: FormGroup = new FormGroup({});
  tagSuggestions$: Observable<Tag[]> = this._tagService.tags$;

  private _subs: Subscription = new Subscription();

  constructor(
    private _tagService: TagService,
    private _cd: ChangeDetectorRef,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _matDialogRef: MatDialogRef<DialogEditTaskRepeatCfgComponent>,
    private _translateService: TranslateService,
    @Inject(LOCALE_ID) private locale: string,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
  ) {
    this.TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS = TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS;

    const today = new Date();
    const weekdayStr = today.toLocaleDateString(locale, {
      weekday: 'long',
    });
    const dateDayStr = today.toLocaleDateString(locale, {
      day: 'numeric',
    });
    const dayAndMonthStr = today.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'numeric',
    });

    (this.TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS[1] as any).templateOptions.options = [
      {
        value: 'DAILY',
        label: this._translateService.instant(T.F.TASK_REPEAT.F.Q_DAILY),
      },
      {
        value: 'WEEKLY_CURRENT_WEEKDAY',
        label: this._translateService.instant(
          T.F.TASK_REPEAT.F.Q_WEEKLY_CURRENT_WEEKDAY,
          { weekdayStr },
        ),
      },
      {
        value: 'MONTHLY_CURRENT_DATE',
        label: this._translateService.instant(T.F.TASK_REPEAT.F.Q_MONTHLY_CURRENT_DATE, {
          dateDayStr,
        }),
      },
      {
        value: 'MONDAY_TO_FRIDAY',
        label: this._translateService.instant(T.F.TASK_REPEAT.F.Q_MONDAY_TO_FRIDAY),
      },
      {
        value: 'YEARLY_CURRENT_DATE',
        label: this._translateService.instant(T.F.TASK_REPEAT.F.Q_YEARLY_CURRENT_DATE, {
          dayAndMonthStr,
        }),
      },
      {
        value: 'CUSTOM',
        label: this._translateService.instant(T.F.TASK_REPEAT.F.Q_CUSTOM, {}),
      },
    ];
  }

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
