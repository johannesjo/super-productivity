import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TaskCopy } from '../../tasks/task.model';
import { ProjectService } from '../../project/project.service';
import { Subscription } from 'rxjs';
import { WorklogExportSettingsCopy, WorkStartEnd } from '../../project/project.model';
import { WORKLOG_EXPORT_DEFAULTS } from '../../project/project.const';
import { getWorklogStr } from '../../../util/get-work-log-str';
import * as moment from 'moment-mini';
import 'moment-duration-format';
import { unique } from '../../../util/unique';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { msToClockString } from '../../../ui/duration/ms-to-clock-string.pipe';
import { roundTime } from '../../../util/round-time';
import { roundDuration } from '../../../util/round-duration';
import Clipboard from 'clipboard';
import { SnackService } from '../../../core/snack/snack.service';
import { WorklogService } from '../worklog.service';
import { WorklogTask } from '../worklog.model';

const LINE_SEPARATOR = '\n';
const EMPTY_VAL = ' - ';

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
  @Input() rangeStart: Date;
  @Input() rangeEnd: Date;
  @Input() isWorklogExport: boolean;
  @Input() isShowClose: boolean;

  @Output() cancel = new EventEmitter();

  isShowAsText = false;
  headlineCols: string[] = [];
  formattedRows: (string | number)[][];
  options: WorklogExportSettingsCopy = WORKLOG_EXPORT_DEFAULTS;
  txt: string;
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
    private _snackService: SnackService,
    private _worklogService: WorklogService,
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
        this.options = Object.assign(WORKLOG_EXPORT_DEFAULTS, pr.advancedCfg.worklogExportSettings);
      } else {
        this.options = WORKLOG_EXPORT_DEFAULTS;
      }

      const tasks: WorklogTask[] = this._worklogService.getTaskListForRange(this.rangeStart, this.rangeEnd, true);

      if (tasks) {
        const rows = this._createRows(tasks, pr.workStart, pr.workEnd);
        this.formattedRows = this._formatRows(rows);
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
              return 'Worked';
            case 'ESTIMATE_MS':
            case 'ESTIMATE_STR':
            case 'ESTIMATE_CLOCK':
              return 'Estimate';
          }
        });

        this.txt = this._formatText(this.headlineCols, this.formattedRows);
      }
    }));

    // dirty but good enough for now
    const clipboard = new Clipboard('#clipboard-btn');
    clipboard.on('success', (e: any) => {
      this._snackService.open({
        msg: 'Copied to clipboard',
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
    this.options.cols = this.options.cols.filter(col => !!col);
    this._projectService.updateWorklogExportSettings(this._projectService.currentId, this.options);
  }

  addCol() {
    this.options.cols.push('EMPTY');
  }

  // TODO this can be optimized to a couple of mapping functions
  private _createRows(tasks: WorklogTask[], startTimes: WorkStartEnd, endTimes: WorkStartEnd): RowItem[] {
    const days: { [key: string]: RowItem } = {};
    const _mapTaskToDay = (task, dateStr) => {
      let day: RowItem = days[dateStr];

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
        tasks: [...day.tasks, task],
      };
    };

    tasks.forEach(task => {
      if (task.subTaskIds && task.subTaskIds.length > 0) {
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
      days[dateStr].titlesWithSub = unique(days[dateStr].tasks.map(t => t.title));
      days[dateStr].titles = unique(days[dateStr].tasks.map(
        t =>
          (t.parentId && tasks.find(pt_ => pt_.id === t.parentId).title)
          || (!t.parentId && t.title)
      )).filter(title => !!title);
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
        const timeSpent = (this.options.roundWorkTimeTo)
          ? roundDuration(row.timeSpent, this.options.roundWorkTimeTo, true).asMilliseconds()
          : row.timeSpent;


        switch (col) {
          case 'DATE':
            return row.date;
          case 'START':
            return (row.workStart)
              ? moment(
                (this.options.roundStartTimeTo)
                  ? roundTime(row.workStart, this.options.roundStartTimeTo)
                  : row.workStart
              ).format('HH:mm')
              : EMPTY_VAL;
          case 'END':
            return (row.workEnd)
              ? moment(
                (this.options.roundEndTimeTo && row.workEnd)
                  ? roundTime(row.workEnd, this.options.roundEndTimeTo)
                  : row.workEnd
              ).format('HH:mm')
              : EMPTY_VAL;
          case 'TITLES':
            return row.titles.join(
              this.options.separateTasksBy || '<br>');
          case 'TITLES_INCLUDING_SUB':
            return row.titlesWithSub.join(this.options.separateTasksBy || '<br>');
          case 'TIME_MS':
            return timeSpent;
          case 'TIME_STR':
            return msToString(timeSpent);
          case 'TIME_CLOCK':
            return msToClockString(timeSpent);
          case 'ESTIMATE_MS':
            return row.timeEstimate;
          case 'ESTIMATE_STR':
            return msToString(row.timeEstimate);
          case 'ESTIMATE_CLOCK':
            return msToClockString(row.timeEstimate);
          default:
            return EMPTY_VAL;
        }
      });
    });
  }

  private _formatText(headlineCols: string[], rows: (string | number)[][]): string {
    let txt = '';
    txt += headlineCols.join(';') + LINE_SEPARATOR;
    txt += rows.map(cols => cols.join(';')).join(LINE_SEPARATOR);
    return txt;
  }
}
