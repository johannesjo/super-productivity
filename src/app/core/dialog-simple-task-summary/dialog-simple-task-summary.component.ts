import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { msToString } from '../../ui/duration/ms-to-string.pipe';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { formatWorklogDateStr } from '../util/format-worklog-date-str';
import { ProjectService } from '../../project/project.service';

@Component({
  selector: 'dialog-simple-task-summary',
  templateUrl: './dialog-simple-task-summary.component.html',
  styleUrls: ['./dialog-simple-task-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSimpleTaskSummaryComponent implements OnInit {
  options: any = {};
  finishDayFn: Function;
  isInvalidRegEx: boolean;
  tasksTxt: string;

  constructor(
    private _matDialogRef: MatDialogRef<DialogSimpleTaskSummaryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _projectService: ProjectService,
  ) {
  }

  ngOnInit() {

    // dirty but good enough for now
    // const clipboard = new window.Clipboard('#clipboard-btn');
    // clipboard.on('success', function (e) {
    //   SimpleToast('SUCCESS', 'Copied to clipboard');
    //   e.clearSelection();
    // });

    this.options = this.data.settings;
    if (!this.options.separateBy) {
      this.options.separateBy = '';
    }
    if (!this.options.separateFieldsBy) {
      this.options.separateFieldsBy = '';
    }
    this.tasksTxt = this._createTasksText(this.data.tasks);
  }

  close() {
    this._matDialogRef.close();
  }

  onOptionsChange() {
    this.tasksTxt = this._createTasksText(this.data.tasks);
    this._projectService.updateSimpleSummarySettings(this._projectService.currentId, this.options);
  }

  private _formatTask(task) {
    let taskTxt = '';
    if (this.options.showDate) {
      taskTxt += task.dateStr || formatWorklogDateStr(new Date());
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
        if ((!this.options.isListDoneOnly || task.isDone) && (!this.options.isWorkedOnTodayOnly || this._checkIsWorkedOnToday(task))) {
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
    const dateStr = formatWorklogDateStr(new Date());
    return !!task.timeSpentOnDay[dateStr];
  }
}
