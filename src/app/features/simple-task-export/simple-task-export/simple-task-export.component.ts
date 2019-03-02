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
import { unqiue } from '../../../util/unique';
import * as moment from 'moment-mini';
import { Duration } from 'moment-mini';
import 'moment-duration-format';

const CSV_EXPORT_SETTINGS = {
  separateTasksBy: '',
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

const LINE_SEPARATOR = '\n';


@Component({
  selector: 'simple-task-export',
  templateUrl: './simple-task-export.component.html',
  styleUrls: ['./simple-task-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleTaskExportComponent implements OnInit, OnDestroy {
  @Input() tasks: any[];
  @Input() dateStart: Date;
  @Input() dateEnd: Date;
  @Input() isWorklogExport: boolean;
  @Input() isShowClose: boolean;

  @Output() cancel = new EventEmitter();

  options: SimpleSummarySettingsCopy = SIMPLE_SUMMARY_DEFAULTS;
  tasksTxt: string;
  tasksHtml: string;
  fileName = 'tasks.csv';
  roundTimeOptions = [
    {id: 'QUARTER', title: 'full quarters'},
    {id: 'HALF', title: 'full half hours'},
    {id: 'HOUR', title: 'full hours'},
  ];

  private _subs: Subscription = new Subscription();

  constructor(
    private _projectService: ProjectService,
    private _snackService: SnackService,
  ) {
  }

  ngOnInit() {
    if (this.dateStart && this.dateEnd) {
      this.fileName
        = 'tasks'
        + getWorklogStr(this.dateStart)
        + '-'
        + getWorklogStr(this.dateEnd)
        + '.csv'
      ;
    }

    this._subs.add(this._projectService.advancedCfg$.subscribe((val) => {
      this.options = val.simpleSummarySettings;

      if (this.tasks) {
        if (this.options.isMergeToDays) {
          this.tasksTxt = this._createTasksTextMergedToDays(this.tasks);
        } else {
          this.tasksTxt = this._createTasksText(this.tasks);
        }

        this.tasksHtml = this._parseToTable(this.tasksTxt);
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

    if (this.options.isShowTimeSpent) {
      taskTxt = this._addSeparator(taskTxt);
      let timeSpent = task.timeSpent;
      if (this.options.roundWorkTimeTo) {
        const val = moment.duration(task.timeSpent);
        timeSpent = this._roundDuration(val, this.options.roundWorkTimeTo, true).asMilliseconds();
      }

      taskTxt += this.options.isTimesAsMilliseconds
        ? timeSpent
        : msToString(timeSpent, false, true);
    }

    if (this.options.isShowTimeEstimate) {
      taskTxt = this._addSeparator(taskTxt);

      taskTxt += this.options.isTimesAsMilliseconds
        ? task.timeEstimate
        : msToString(task.timeEstimate, false, true);
    }

    if (this.options.isShowTitle) {
      taskTxt = this._addSeparator(taskTxt);
      taskTxt += task.title;
    }

    return taskTxt;
  }

  private _addSeparator(taskTxt) {
    if (taskTxt.length > 0) {
      taskTxt += this.options.separateFieldsBy;
    }
    return taskTxt;
  }

  private _createTasksTextMergedToDays(tasks: TaskWithSubTasks[]) {
    const _mapTaskToDay = (task, dateStr, parentTitle?) => {
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
          tasks: [...day.tasks, {...task, parentTitle}],
        };
      }
    };

    const days = {};
    let tasksTxt = '';

    tasks.forEach(task => {
      if (task.subTasks && task.subTasks.length > 0) {
        task.subTasks.forEach((subTask) => {
          if (subTask.timeSpentOnDay) {
            Object.keys(subTask.timeSpentOnDay).forEach(dateStr => {
              _mapTaskToDay(subTask, dateStr, task.title);
            });
          }
        });
      } else {
        if (task.timeSpentOnDay) {
          Object.keys(task.timeSpentOnDay).forEach(dateStr => {
            _mapTaskToDay(task, dateStr);
          });
        }
      }
    });
    Object.keys(days).sort().forEach(dateStr => {
      days[dateStr].dateStr = dateStr;
      days[dateStr].title = unqiue(days[dateStr].tasks.map(t => {
        return (!this.options.isListSubTasks && t.parentTitle)
          ? t.parentTitle
          : t.title;
      }))
        .join(this.options.separateTasksBy || ' | ');

      tasksTxt += this._formatTask(days[dateStr]);
      tasksTxt += LINE_SEPARATOR;
    });
    return tasksTxt;
  }

  private _createTasksText(tasks: TaskWithSubTasks[]) {
    let tasksTxt = '';

    if (tasks) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (
          (this.isWorklogExport)
          || (!this.options.isListDoneOnly || task.isDone)
          && (!this.options.isWorkedOnTodayOnly || this._checkIsWorkedOnToday(task))
        ) {
          tasksTxt += this._formatTask(task);
          tasksTxt += LINE_SEPARATOR;
        }

        if (this.options.isListSubTasks && task.subTasks && task.subTasks.length > 0) {
          for (let j = 0; j < task.subTasks.length; j++) {
            const subTask = task.subTasks[j];
            if (
              (!this.options.isListDoneOnly || subTask.isDone)
              && (!this.options.isWorkedOnTodayOnly || this._checkIsWorkedOnToday(subTask))) {
              tasksTxt += this._formatTask(subTask);
              tasksTxt += LINE_SEPARATOR;
            }
          }
        }
      }
    }

    // remove last new line
    tasksTxt = tasksTxt.substring(0, tasksTxt.length - LINE_SEPARATOR.length);

    return tasksTxt;
  }

  private _checkIsWorkedOnToday(task) {
    const dateStr = getWorklogStr();
    return !!task.timeSpentOnDay[dateStr];
  }

  private _roundDuration(value: Duration, roundTo, isRoundUp): Duration {
    let rounded;

    switch (roundTo) {
      case 'QUARTER':
        rounded = Math.round(value.asMinutes() / 15) * 15;
        if (isRoundUp) {
          rounded = Math.ceil(value.asMinutes() / 15) * 15;
        }
        return moment.duration({minutes: rounded});

      case 'HALF':
        rounded = Math.round(value.asMinutes() / 30) * 30;
        if (isRoundUp) {
          rounded = Math.ceil(value.asMinutes() / 30) * 30;
        }
        return moment.duration({minutes: rounded});

      case 'HOUR':
        rounded = Math.round(value.asMinutes() / 60) * 60;
        if (isRoundUp) {
          rounded = Math.ceil(value.asMinutes() / 60) * 60;
        }
        return moment.duration({minutes: rounded});

      default:
        return value;
    }
  }

  private _parseToTable(tasksTxt) {
    let rowsHtml = '';
    const rows = tasksTxt.split(LINE_SEPARATOR).filter(row => row.length);

    rows.forEach(row => {
      const cols = row.split(this.options.separateFieldsBy);
      rowsHtml += `<tr><td>${cols.join('</td><td>')}</td></tr>`;
    });

    const headerCols = [];
    if (this.options.isShowDate) {
      headerCols.push('Date');
    }
    if (this.options.isShowTimeSpent) {
      headerCols.push('Time Spent');
    }
    if (this.options.isShowTimeEstimate) {
      headerCols.push('Estimate');
    }
    if (this.options.isShowTitle) {
      if (this.options.isMergeToDays) {
        headerCols.push('Tasks');
      } else {
        headerCols.push('Title');
      }
    }
    const headerColsHtml = `<tr><th>${headerCols.join('</th><th>')}</th></tr>`;
    if (!rows.length) {
      rowsHtml += `<tr><td>${Array(headerCols.length).fill('- No Data -').join('</td><td>')}</td></tr>`;
    }

    return `<table>${headerColsHtml}${rowsHtml}</table>`;
  }
}
