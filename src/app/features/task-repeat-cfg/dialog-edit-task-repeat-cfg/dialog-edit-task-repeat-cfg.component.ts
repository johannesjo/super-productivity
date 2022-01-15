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
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfg,
  TaskRepeatCfgCopy,
} from '../task-repeat-cfg.model';
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
import { getWorklogStr } from '../../../util/get-work-log-str';

// TASK_REPEAT_CFG_FORM_CFG
@Component({
  selector: 'dialog-edit-task-repeat-cfg',
  templateUrl: './dialog-edit-task-repeat-cfg.component.html',
  styleUrls: ['./dialog-edit-task-repeat-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogEditTaskRepeatCfgComponent implements OnInit, OnDestroy {
  T: typeof T = T;

  repeatCfgInitial?: TaskRepeatCfgCopy;
  repeatCfg: Omit<TaskRepeatCfgCopy, 'id'> | TaskRepeatCfg;
  repeatCfgId: string | null;
  isEdit: boolean;

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
    @Inject(LOCALE_ID) private _locale: string,
    @Inject(MAT_DIALOG_DATA) private _data: { task?: Task; repeatCfg?: TaskRepeatCfg },
  ) {
    if (this._data.repeatCfg) {
      this.repeatCfgInitial = { ...this._data.repeatCfg };
      this.repeatCfg = { ...this._data.repeatCfg };
      this.repeatCfgId = this._data.repeatCfg.id;
      this.isEdit = true;
    } else if (this._data.task) {
      this.repeatCfg = {
        ...DEFAULT_TASK_REPEAT_CFG,
        startDate: getWorklogStr(),
        title: this._data.task.title,
        // NOTE: always add today tag, as that's likely what we want
        tagIds: unique([TODAY_TAG.id, ...this._data.task.tagIds]),
        defaultEstimate: this._data.task.timeEstimate,
      };
      this.repeatCfgId = this._data.task.repeatCfgId;
      this.isEdit = !!this.repeatCfgId;
    } else {
      throw new Error('Invalid params given for repeat dialog!');
    }

    this.TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS = TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS;

    const today = new Date();
    const weekdayStr = today.toLocaleDateString(_locale, {
      weekday: 'long',
    });
    const dateDayStr = today.toLocaleDateString(_locale, {
      day: 'numeric',
    });
    const dayAndMonthStr = today.toLocaleDateString(_locale, {
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
    if (this.isEdit && this.repeatCfgId && this._data.task) {
      this._subs.add(
        this._taskRepeatCfgService
          .getTaskRepeatCfgById$(this.repeatCfgId)
          .subscribe((cfg) => {
            this.repeatCfg = { ...cfg };
            this.repeatCfgInitial = { ...cfg };
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
      if (!this.repeatCfgInitial) {
        throw new Error('Initial task repeat cfg missing (code error)');
      }
      const isRelevantChangesForUpdateAllTasks =
        this.repeatCfgInitial.title !== this.repeatCfg.title ||
        this.repeatCfgInitial.defaultEstimate !== this.repeatCfg.defaultEstimate ||
        this.repeatCfgInitial.remindAt !== this.repeatCfg.remindAt ||
        this.repeatCfgInitial.startTime !== this.repeatCfg.startTime ||
        JSON.stringify(this.repeatCfgInitial.tagIds) !==
          JSON.stringify(this.repeatCfg.tagIds);

      this._taskRepeatCfgService.updateTaskRepeatCfg(
        exists(this.repeatCfgId),
        this.repeatCfg,
        isRelevantChangesForUpdateAllTasks,
      );
      this.close();
    } else {
      this._taskRepeatCfgService.addTaskRepeatCfgToTask(
        (this._data.task as Task).id,
        (this._data.task as Task).projectId,
        this.repeatCfg,
      );
      this.close();
    }
  }

  remove(): void {
    this._taskRepeatCfgService.deleteTaskRepeatCfgWithDialog(exists(this.repeatCfgId));
    this.close();
  }

  close(): void {
    this._matDialogRef.close();
  }

  addTag(id: string): void {
    this._updateTags(unique([...this.repeatCfg.tagIds, id]));
  }

  addNewTag(title: string): void {
    const id = this._tagService.addTag({ title });
    this._updateTags(unique([...this.repeatCfg.tagIds, id]));
  }

  removeTag(id: string): void {
    const updatedTagIds = this.repeatCfg.tagIds.filter((tagId) => tagId !== id);
    this._updateTags(updatedTagIds);
  }

  private _updateTags(newTagIds: string[]): void {
    this.repeatCfg = {
      ...this.repeatCfg,
      tagIds: newTagIds,
    };
  }
}
