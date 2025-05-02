import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  LOCALE_ID,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Task, TaskReminderOptionId } from '../../tasks/task.model';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TaskRepeatCfgService } from '../task-repeat-cfg.service';
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfg,
  TaskRepeatCfgCopy,
} from '../task-repeat-cfg.model';
import { Observable, Subscription } from 'rxjs';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { UntypedFormGroup } from '@angular/forms';
import {
  TASK_REPEAT_CFG_ADVANCED_FORM_CFG,
  TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS,
} from './task-repeat-cfg-form.const';
import { T } from '../../../t.const';
import { TagService } from '../../tag/tag.service';
import { unique } from '../../../util/unique';
import { Tag } from '../../tag/tag.model';
import { exists } from '../../../util/exists';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { first } from 'rxjs/operators';
import { getQuickSettingUpdates } from './get-quick-setting-updates';
import { clockStringFromDate } from '../../../ui/duration/clock-string-from-date';
import { HelpSectionComponent } from '../../../ui/help-section/help-section.component';
import { ChipListInputComponent } from '../../../ui/chip-list-input/chip-list-input.component';
import { MatButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

// TASK_REPEAT_CFG_FORM_CFG
@Component({
  selector: 'dialog-edit-task-repeat-cfg',
  templateUrl: './dialog-edit-task-repeat-cfg.component.html',
  styleUrls: ['./dialog-edit-task-repeat-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    TranslatePipe,
    MatDialogContent,
    HelpSectionComponent,
    FormlyModule,
    ChipListInputComponent,
    MatDialogActions,
    MatButton,
    AsyncPipe,
    MatIcon,
  ],
})
export class DialogEditTaskRepeatCfgComponent implements OnInit, OnDestroy {
  private _tagService = inject(TagService);
  private _cd = inject(ChangeDetectorRef);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _matDialogRef =
    inject<MatDialogRef<DialogEditTaskRepeatCfgComponent>>(MatDialogRef);
  private _translateService = inject(TranslateService);
  private _locale = inject(LOCALE_ID);
  private _data = inject<{
    task?: Task;
    repeatCfg?: TaskRepeatCfg;
  }>(MAT_DIALOG_DATA);

  T: typeof T = T;

  repeatCfgInitial?: TaskRepeatCfgCopy;
  repeatCfg: Omit<TaskRepeatCfgCopy, 'id'> | TaskRepeatCfg;
  isEdit: boolean;

  TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS: FormlyFieldConfig[];
  TASK_REPEAT_CFG_ADVANCED_FORM_CFG: FormlyFieldConfig[];

  formGroup1: UntypedFormGroup = new UntypedFormGroup({});
  formGroup2: UntypedFormGroup = new UntypedFormGroup({});
  tagSuggestions$: Observable<Tag[]> = this._tagService.tags$;

  private _subs: Subscription = new Subscription();

  constructor() {
    const _locale = this._locale;

    if (this._data.repeatCfg) {
      // NOTE: just for typing....
      this.repeatCfg = { ...this._data.repeatCfg };
      this._setRepeatCfgInitiallyForEditOnly(this._data.repeatCfg);
      this.isEdit = true;
    } else if (this._data.task) {
      const startTime = this._data.task.dueWithTime
        ? clockStringFromDate(this._data.task.dueWithTime)
        : undefined;
      this.repeatCfg = {
        ...DEFAULT_TASK_REPEAT_CFG,
        startDate: getWorklogStr(this._data.task.dueWithTime || undefined),
        startTime,
        remindAt: startTime ? TaskReminderOptionId.AtStart : undefined,
        title: this._data.task.title,
        notes: this._data.task.notes || undefined,
        tagIds: unique(this._data.task.tagIds),
        defaultEstimate: this._data.task.timeEstimate,
      };
      this.isEdit = !!this._data.task.repeatCfgId;
    } else {
      throw new Error('Invalid params given for repeat dialog!');
    }

    this.TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS = TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS;
    this.TASK_REPEAT_CFG_ADVANCED_FORM_CFG = TASK_REPEAT_CFG_ADVANCED_FORM_CFG;

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
        value: 'MONDAY_TO_FRIDAY',
        label: this._translateService.instant(T.F.TASK_REPEAT.F.Q_MONDAY_TO_FRIDAY),
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
    if (this.isEdit && this._data.task?.repeatCfgId) {
      this._subs.add(
        this._taskRepeatCfgService
          .getTaskRepeatCfgById$(this._data.task.repeatCfgId)
          .pipe(first())
          .subscribe((cfg) => {
            this._setRepeatCfgInitiallyForEditOnly(cfg);
            this._cd.detectChanges();
          }),
      );
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  save(): void {
    // workaround for formly not always updating hidden fields correctly (in time??)
    if (this.repeatCfg.quickSetting !== 'CUSTOM') {
      const updatesForQuickSetting = getQuickSettingUpdates(this.repeatCfg.quickSetting);
      if (updatesForQuickSetting) {
        this.repeatCfg = { ...this.repeatCfg, ...updatesForQuickSetting };
      }
    }

    if (this.isEdit) {
      if (!this.repeatCfgInitial) {
        throw new Error('Initial task repeat cfg missing (code error)');
      }
      const isRelevantChangesForUpdateAllTasks =
        this.repeatCfgInitial.title !== this.repeatCfg.title ||
        this.repeatCfgInitial.defaultEstimate !== this.repeatCfg.defaultEstimate ||
        this.repeatCfgInitial.remindAt !== this.repeatCfg.remindAt ||
        this.repeatCfgInitial.startTime !== this.repeatCfg.startTime ||
        this.repeatCfgInitial.notes !== this.repeatCfg.notes ||
        JSON.stringify(this.repeatCfgInitial.tagIds) !==
          JSON.stringify(this.repeatCfg.tagIds);

      this._taskRepeatCfgService.updateTaskRepeatCfg(
        exists((this.repeatCfg as TaskRepeatCfg).id),
        this.repeatCfg,
        isRelevantChangesForUpdateAllTasks,
      );
      this.close();
    } else {
      this._taskRepeatCfgService.addTaskRepeatCfgToTask(
        (this._data.task as Task).id,
        (this._data.task as Task).projectId || null,
        this.repeatCfg,
      );
      this.close();
    }
  }

  remove(): void {
    this._taskRepeatCfgService.deleteTaskRepeatCfgWithDialog(
      exists((this.repeatCfg as TaskRepeatCfg).id),
    );
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

  private _setRepeatCfgInitiallyForEditOnly(repeatCfg: TaskRepeatCfg): void {
    this.repeatCfg = { ...repeatCfg };
    this.repeatCfgInitial = { ...repeatCfg };

    if (this.repeatCfg.quickSetting === 'WEEKLY_CURRENT_WEEKDAY') {
      if (!this.repeatCfg.startDate) {
        throw new Error('Invalid repeat cfg');
      }
      if (new Date(this.repeatCfg.startDate).getDay() !== new Date().getDay()) {
        this.repeatCfg = { ...this.repeatCfg, quickSetting: 'CUSTOM' };
      }
    }
    if (this.repeatCfg.quickSetting === 'YEARLY_CURRENT_DATE') {
      if (!this.repeatCfg.startDate) {
        throw new Error('Invalid repeat cfg');
      }
      if (
        new Date(this.repeatCfg.startDate).getDate() !== new Date().getDate() ||
        new Date(this.repeatCfg.startDate).getMonth() !== new Date().getMonth()
      ) {
        this.repeatCfg = { ...this.repeatCfg, quickSetting: 'CUSTOM' };
      }
    }
    if (this.repeatCfg.quickSetting === 'MONTHLY_CURRENT_DATE') {
      if (!this.repeatCfg.startDate) {
        throw new Error('Invalid repeat cfg');
      }
      if (new Date(this.repeatCfg.startDate).getDate() !== new Date().getDate()) {
        this.repeatCfg = { ...this.repeatCfg, quickSetting: 'CUSTOM' };
      }
    }
  }

  private _updateTags(newTagIds: string[]): void {
    this.repeatCfg = {
      ...this.repeatCfg,
      tagIds: newTagIds,
    };
  }
}
