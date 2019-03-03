import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TaskCopy, TaskWithSubTasks } from '../../tasks/task.model';
import { ProjectService } from '../../project/project.service';
import { Subscription } from 'rxjs';
import { WorklogExportSettingsCopy, WorkStartEnd } from '../../project/project.model';
import { WORKLOG_EXPORT_DEFAULTS } from '../../project/project.const';
import { getWorklogStr } from '../../../util/get-work-log-str';
import * as moment from 'moment-mini';
import { Duration } from 'moment-mini';
import 'moment-duration-format';
import { unqiue } from '../../../util/unique';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { msToClockString } from '../../../ui/duration/ms-to-clock-string.pipe';

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

interface TaskWithParentTitle extends TaskCopy {
  parentTitle?: string;
}

interface RowItem {
  date: string;
  workStart: number;
  workEnd: number;
  timeSpent: number;
  timeEstimate: number;
  tasks: TaskWithParentTitle[];
  titles?: string[];
  titlesWithSub?: string[];
}

@Component({
  selector: 'worklog-export',
  templateUrl: './worklog-export.component.html',
  styleUrls: ['./worklog-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorklogExportComponent implements OnInit, OnDestroy {
  @Input() tasks: any[];
  @Input() rangeStart: Date;
  @Input() rangeEnd: Date;
  @Input() isWorklogExport: boolean;
  @Input() isShowClose: boolean;

  @Output() cancel = new EventEmitter();

  isShowAsText = false;
  headlineCols: string[] = [];
  rows: RowItem[] = [];
  formattedRows: (string | number)[][];
  options: WorklogExportSettingsCopy = WORKLOG_EXPORT_DEFAULTS;
  tasksTxt: string;
  fileName = 'tasks.csv';
  roundTimeOptions = [
    {id: 'QUARTER', title: 'full quarters'},
    {id: 'HALF', title: 'full half hours'},
    {id: 'HOUR', title: 'full hours'},
  ];

  colOpts = [
    {id: 'DATE', title: 'Date'},
    {id: 'START', title: 'Started Working'},
    {id: 'END', title: 'Ended Working'},
    {id: 'TITLES', title: 'Parent Task Titles only'},
    {id: 'TITLES_INCLUDING_SUB', title: 'Titles and Sub Task Titles'},
    {id: 'TIME_MS', title: 'Time as milliseconds'},
    {id: 'TIME_STR', title: 'Time as string (e.g. 5h 23m)'},
    {id: 'TIME_CLOCK', title: 'Time as clock (e.g. 5:23)'},
    {id: 'ESTIMATE_MS', title: 'Estimate as milliseconds'},
    {id: 'ESTIMATE_STR', title: 'Estimate as string (e.g. 5h 23m)'},
    {id: 'ESTIMATE_CLOCK', title: 'Estimate as clock (e.g. 5:23)'},
  ];

  private _subs: Subscription = new Subscription();

  constructor(
    private _projectService: ProjectService,
  ) {
  }

  ngOnInit() {
    if (this.rangeStart && this.rangeEnd) {
      this.fileName
        = 'tasks'
        + getWorklogStr(this.rangeStart)
        + '-'
        + getWorklogStr(this.rangeEnd)
        + '.csv'
      ;
    }

    this._subs.add(this._projectService.currentProject$.subscribe((pr) => {
      if (pr.advancedCfg.worklogExportSettings) {
        this.options = pr.advancedCfg.worklogExportSettings;
      } else {
        this.options = WORKLOG_EXPORT_DEFAULTS;
      }

      this.options = WORKLOG_EXPORT_DEFAULTS;

      if (this.tasks) {
        this.rows = this._createRows(this.tasks, pr.workStart, pr.workEnd);
        this.formattedRows = this._formatRows(this.rows);
        // TODO format to csv

        this.headlineCols = this.options.cols.map(col => {
          switch (col) {
            case 'DATE':
              return 'Date';
            case 'START':
              return 'Start';
            case 'END':
              return 'End';
            case 'TITLES':
              return 'Titles';
            case 'TITLES_INCLUDING_SUB':
              return 'Titles';
            case 'TIME_MS':
            case 'TIME_STR':
            case 'TIME_CLOCK':
              return 'Time Spent';
            case 'ESTIMATE_MS':
            case 'ESTIMATE_STR':
            case 'ESTIMATE_CLOCK':
              return 'Estimate';
          }
        });
      }
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onCancelClick() {
    this.cancel.emit();
  }

  onOptionsChange() {
    this.options.cols = this.options.cols.filter(col => !!col);
    this._projectService.updateWorklogExportSettings(this._projectService.currentId, this.options);
  }

  addCol() {
    this.options.cols.push('EMPTY');
  }

  // TODO this can be optimized to a couple of mapping functions
  private _createRows(tasks: TaskWithSubTasks[], startTimes: WorkStartEnd, endTimes: WorkStartEnd): RowItem[] {
    const days: { [key: string]: RowItem } = {};
    const _mapTaskToDay = (task, dateStr, parentTitle?) => {
      const taskDate = new Date(dateStr);
      let day: RowItem = days[dateStr];

      if (taskDate >= this.rangeStart && taskDate < this.rangeEnd) {
        if (!day) {
          day = days[dateStr] = {
            date: dateStr,
            timeSpent: 0,
            timeEstimate: 0,
            tasks: [],
            titlesWithSub: [],
            workStart: startTimes[dateStr],
            workEnd: endTimes[dateStr],
          };
        }
        days[dateStr] = {
          ...days[dateStr],
          timeSpent: day.timeSpent + task.timeSpentOnDay[dateStr],
          timeEstimate: day.timeEstimate + task.timeEstimate,
          tasks: [...day.tasks, {
            ...task,
            parentTitle
          }],
        };
      }
    };

    tasks.forEach(task => {
      // TODO find out why there are no sub tasks
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

    const rows = [];
    Object.keys(days).sort().forEach(dateStr => {
      days[dateStr].titles = unqiue(days[dateStr].tasks.map(t => t.parentTitle || t.title));
      days[dateStr].titlesWithSub = unqiue(days[dateStr].tasks.map(t => t.title));
      rows.push(days[dateStr]);
    });
    return rows;
  }

  private _formatRows(rows: RowItem[]): (string | number)[][] {
    return rows.map(row => {
      return this.options.cols.map(col => {
        if (!col) {
          return;
        }

        let timeSpent = row.timeSpent;
        const timeEstimate = row.timeEstimate;

        if (this.options.roundWorkTimeTo) {
          timeSpent = this._roundDuration(timeSpent, this.options.roundWorkTimeTo, true).asMilliseconds();
        }

        // if (this.options.roundWorkTimeTo) {
        //   timeEstimate = this._roundDuration(timeEstimate, this.options.roundWorkTimeTo, true).asMilliseconds();
        // }

        switch (col) {
          case 'DATE':
            return row.date;
          case 'START':
            return row.workStart;
          case 'END':
            return row.workEnd;
          case 'TITLES':
            return row.titles.join(this.options.separateTasksBy || ' | ');
          case 'TITLES_INCLUDING_SUB':
            return row.titlesWithSub.join(this.options.separateTasksBy || ' | ');
          case 'TIME_MS':
            return timeSpent;
          case 'TIME_STR':
            return msToString(timeSpent);
          case 'TIME_CLOCK':
            return msToClockString(timeSpent);
          case 'ESTIMATE_MS':
            return timeEstimate;
          case 'ESTIMATE_STR':
            return msToString(timeEstimate);
          case 'ESTIMATE_CLOCK':
            return msToClockString(timeEstimate);
        }
      });
    });
  }


  private _roundDuration(ms: number, roundTo, isRoundUp): Duration {
    let rounded;
    const value = moment.duration(ms);

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
}
