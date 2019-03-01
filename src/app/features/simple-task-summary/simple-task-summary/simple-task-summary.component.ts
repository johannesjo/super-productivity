import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { ProjectService } from '../../project/project.service';
import { Subscription } from 'rxjs';
import { SimpleSummarySettingsCopy } from '../../project/project.model';
import { SIMPLE_SUMMARY_DEFAULTS } from '../../project/project.const';
import Clipboard from 'clipboard';
import { SnackService } from '../../../core/snack/snack.service';
import { getWorklogStr } from '../../../util/get-work-log-str';

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
  selector: 'simple-task-summary',
  templateUrl: './simple-task-summary.component.html',
  styleUrls: ['./simple-task-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleTaskSummaryComponent implements OnInit, OnDestroy {
  @Input() tasks: any[];
  @Input() dateStart: Date;
  @Input() dateEnd: Date;
  @Input() isWorklogExport: boolean;
  @Input() isShowClose: boolean;

  @Output() cancel = new EventEmitter();

  options: SimpleSummarySettingsCopy = SIMPLE_SUMMARY_DEFAULTS;
  isInvalidRegEx: boolean;
  tasksTxt: string;

  private _subs: Subscription = new Subscription();

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._projectService.advancedCfg$.subscribe((val) => {
      this.options = val.simpleSummarySettings;

      if (this.tasks) {
        if (this.options.isMergeToDays) {
          this.tasksTxt = this._createTasksTextMergedToDays(this.tasks);
        } else {
          this.tasksTxt = this._createTasksText(this.tasks);
        }
      }
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

  onCancelClick() {
    this.cancel.emit();
  }

  onOptionsChange() {
    this._projectService.updateSimpleSummarySettings(this._projectService.currentId, this.options);
  }

  private _formatTask(task) {
    let taskTxt = '';
    if (this.options.isShowDate) {
      taskTxt += task.dateStr || getWorklogStr();
    }

    if (this.options.isShowTitle) {
      taskTxt = this._addSeparator(taskTxt);
      taskTxt += task.title;
    }

    if (this.options.isShowTimeSpent) {
      taskTxt = this._addSeparator(taskTxt);

      taskTxt += this.options.isTimesAsMilliseconds
        ? task.timeSpent
        : msToString(task.timeSpent, false, true);
    }

    if (this.options.isShowTimeEstimate) {
      taskTxt = this._addSeparator(taskTxt);

      taskTxt += this.options.isTimesAsMilliseconds
        ? task.timeEstimate
        : msToString(task.timeEstimate, false, true);
    }

    taskTxt += this.options.separateBy;
    return taskTxt;
  }

  private _addSeparator(taskTxt) {
    if (taskTxt.length > 0) {
      taskTxt += this.options.separateFieldsBy;
    }
    return taskTxt;
  }

  private _createTasksTextMergedToDays(tasks: TaskWithSubTasks[]) {
    const _mapTaskToDay = (task, dateStr) => {
      const taskDate = new Date(dateStr);
      let day = days[dateStr];
      if (taskDate >= this.dateStart && taskDate < this.dateEnd) {

        if (!day) {
          day = days[dateStr] = {
            timeSpent: 0,
            timeEstimate: 0,
            tasks: []
          };
        }
        days[dateStr] = {
          timeSpent: day.timeSpent + task.timeSpentOnDay[dateStr],
          timeEstimate: day.timeSpent + task.timeEstimate,
          tasks: [...day.tasks, task],
        };
      }
    };

    const days = {};
    let tasksTxt = '';
    const newLineSeparator = '\n';
    const taskSeparator = ' | ';

    console.log(tasks);

    tasks.forEach(task => {
      if (task.subTasks && task.subTasks.length > 0) {
        task.subTasks.forEach((subTask) => {
          console.log(subTask);

          if (subTask.timeSpentOnDay) {
            Object.keys(subTask.timeSpentOnDay).forEach(dateStr => {
              console.log('ADD SUB');
              _mapTaskToDay(subTask, dateStr);
            });
          }
        });
      } else {
        if (task.timeSpentOnDay) {
          Object.keys(task.timeSpentOnDay).forEach(dateStr => {
            console.log('ADD PAR');

            _mapTaskToDay(task, dateStr);
          });
        }
      }
    });
    console.log(days);
    Object.keys(days).sort().forEach(dateStr => {
      days[dateStr].dateStr = dateStr;
      tasksTxt += this._formatTask(days[dateStr]);
      if (this.options.isUseNewLine) {
        tasksTxt += newLineSeparator;
      }
    });
    return tasksTxt;
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
