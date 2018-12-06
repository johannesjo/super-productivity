import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { msToString } from '../../ui/duration/ms-to-string.pipe';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { ProjectService } from '../../project/project.service';
import { Subscription } from 'rxjs';
import { SimpleSummarySettingsCopy } from '../../project/project.model';
import { SIMPLE_SUMMARY_DEFAULTS } from '../../project/project.const';
import Clipboard from 'clipboard';
import { SnackService } from '../snack/snack.service';
import { getWorklogStr } from '../util/get-work-log-str';

const CSV_EXPORT_SETTINGS = {
  separateBy: '',
  separateFieldsBy: ';',
  isUseNewLine: true,
  isListSubTasks: true,
  isListDoneOnly: false,
  isWorkedOnTodayOnly: true,
  showTitle: true,
  showTimeSpent: true,
  isTimeSpentAsMilliseconds: true,
  showDate: false
};

@Component({
  selector: 'dialog-simple-task-summary',
  templateUrl: './dialog-simple-task-summary.component.html',
  styleUrls: ['./dialog-simple-task-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSimpleTaskSummaryComponent implements OnInit, OnDestroy {
  options: SimpleSummarySettingsCopy = SIMPLE_SUMMARY_DEFAULTS;
  isInvalidRegEx: boolean;
  tasksTxt: string;
  isWorklogExport = this.data.isWorklogExport;

  private _subs: Subscription = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogSimpleTaskSummaryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _projectService: ProjectService,
    private _snackService: SnackService,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._projectService.advancedCfg$.subscribe((val) => {
      this.options = val.simpleSummarySettings;
      this.tasksTxt = this._createTasksText(this.data.tasks);
    }));

    // dirty but good enough for now
    const clipboard = new Clipboard('#clipboard-btn');
    clipboard.on('success', (e: any) => {
      this._snackService.open({
        message: 'Copied to clipboard',
        type: 'SUCCESS'
      });
      e.clearSelection();
    });
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  close() {
    this._matDialogRef.close();
  }

  onOptionsChange() {
    this._projectService.updateSimpleSummarySettings(this._projectService.currentId, this.options);
  }

  private _formatTask(task) {
    let taskTxt = '';
    if (this.options.showDate) {
      taskTxt += task.dateStr || getWorklogStr();
    }
    if (this.options.showTitle) {
      if (taskTxt.length > 0) {
        taskTxt += this.options.separateFieldsBy;
      }
      taskTxt += task.title;
    }
    if (this.options.showTimeSpent) {
      if (taskTxt.length > 0) {
        taskTxt += this.options.separateFieldsBy;
      }

      if (this.options.isTimeSpentAsMilliseconds) {
        taskTxt += task.timeSpent;
      } else {
        taskTxt += msToString(task.timeSpent);
      }
    }

    taskTxt += this.options.separateBy;
    return taskTxt;
  }

  private _createTasksText(tasks: TaskWithSubTasks[]) {
    let tasksTxt = '';
    const newLineSeparator = '\n';

    if (tasks) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (
          (this.isWorklogExport)
          || (!this.options.isListDoneOnly || task.isDone)
          && (!this.options.isWorkedOnTodayOnly || this._checkIsWorkedOnToday(task))
        ) {
          tasksTxt += this._formatTask(task);
          if (this.options.isUseNewLine) {
            tasksTxt += newLineSeparator;
          }
        }

        if (this.options.isListSubTasks && task.subTasks && task.subTasks.length > 0) {
          for (let j = 0; j < task.subTasks.length; j++) {
            const subTask = task.subTasks[j];
            if (
              (!this.options.isListDoneOnly || subTask.isDone)
              && (!this.options.isWorkedOnTodayOnly || this._checkIsWorkedOnToday(subTask))) {
              tasksTxt += this._formatTask(subTask);
              if (this.options.isUseNewLine) {
                tasksTxt += newLineSeparator;
              }
            }
          }
        }
      }
    }

    // cut off last separator
    tasksTxt = tasksTxt.substring(0, tasksTxt.length - this.options.separateBy.length);
    if (this.options.isUseNewLine) {
      tasksTxt = tasksTxt.substring(0, tasksTxt.length - newLineSeparator.length);
    }

    if (this.options.regExToRemove) {
      this.isInvalidRegEx = false;
      try {
        const regEx = new RegExp(this.options.regExToRemove, 'g');
        tasksTxt = tasksTxt.replace(regEx, '');
      } catch (e) {
        this.isInvalidRegEx = true;
      }
    }

    return tasksTxt;
  }

  private _checkIsWorkedOnToday(task) {
    const dateStr = getWorklogStr();
    return !!task.timeSpentOnDay[dateStr];
  }
}
