import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {TaskCopy} from '../../tasks/task.model';
import {ProjectService} from '../../project/project.service';
import {Subscription} from 'rxjs';
import {WorklogExportSettingsCopy, WorkStartEnd} from '../../project/project.model';
import {WORKLOG_EXPORT_DEFAULTS} from '../../project/project.const';
import {getWorklogStr} from '../../../util/get-work-log-str';
import * as moment from 'moment-mini';
import 'moment-duration-format';
import {unique} from '../../../util/unique';
import {msToString} from '../../../ui/duration/ms-to-string.pipe';
import {msToClockString} from '../../../ui/duration/ms-to-clock-string.pipe';
import {roundTime} from '../../../util/round-time';
import {roundDuration} from '../../../util/round-duration';
import Clipboard from 'clipboard';
import {SnackService} from '../../../core/snack/snack.service';
import {WorklogService} from '../worklog.service';
import {WorklogTask} from '../worklog.model';

const LINE_SEPARATOR = '\n';
const EMPTY_VAL = ' - ';

interface TaskWithParentTitle extends TaskCopy {
  parentTitle?: string;
}

interface RowItem {
  dates: string[];
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

  groupByOptions = [
    {id: 'DATE', title: 'Date'},
    {id: 'TASK', title: 'Task/Subtask'},
    {id: 'PARENT', title: 'Parent Task'},
    {id: 'WORKLOG', title: 'Work Log'}
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
        const rows = this._createRows(tasks, pr.workStart, pr.workEnd, this.options.groupBy);
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

  private _createRows(tasks: WorklogTask[], startTimes: WorkStartEnd, endTimes: WorkStartEnd, groupBy: string): RowItem[] {

    const _mapToGroups = (task: WorklogTask) => {
      const taskGroups: {[key: string]: RowItem} = {};
      const emptyGroup = {
        dates: [],
        timeSpent: 0,
        timeEstimate: 0,
        tasks: [],
        titlesWithSub: [],
        titles: [],
        workStart: undefined,
        workEnd: undefined,
      };
      switch (groupBy) {
        case 'DATE':
          taskGroups[task.dateStr] = emptyGroup;
          taskGroups[task.dateStr].tasks = [task];
          taskGroups[task.dateStr].dates = [task.dateStr];
          taskGroups[task.dateStr].workStart = startTimes[task.dateStr];
          taskGroups[task.dateStr].workEnd = endTimes[task.dateStr];
          taskGroups[task.dateStr].timeEstimate = task.timeEstimate / Object.keys(task.timeSpentOnDay).length;
          taskGroups[task.dateStr].timeSpent = task.timeSpentOnDay[task.dateStr];
          break;
        case 'PARENT':
          let child = task;
          while (child.parentId) {
            child = tasks.find(parent => parent.id === task.parentId);
          }
          taskGroups[child.id] = emptyGroup;
          taskGroups[child.id].tasks = [task];
          taskGroups[child.id].dates = Object.keys(task.timeSpentOnDay);
          taskGroups[child.id].timeEstimate = task.timeEstimate;
          taskGroups[child.id].timeSpent = task.timeSpent;
          break;
        case 'TASK':
          taskGroups[task.id] = emptyGroup;
          taskGroups[task.id].tasks = [task];
          taskGroups[task.id].dates = Object.keys(task.timeSpentOnDay);
          taskGroups[task.id].timeEstimate = task.timeEstimate;
          taskGroups[task.id].timeSpent = task.timeSpent;
          break;
        default: // group by work log (don't group at all)
          Object.keys(task.timeSpentOnDay).forEach(day => {
            const groupKey = task.id + '_' + day;
            taskGroups[groupKey] = emptyGroup;
            taskGroups[groupKey].tasks = [task];
            taskGroups[groupKey].dates = [day];
            taskGroups[groupKey].workStart = startTimes[day];
            taskGroups[groupKey].workEnd = endTimes[day];
            taskGroups[groupKey].timeEstimate = task.timeEstimate / Object.keys(task.timeSpentOnDay).length;
            taskGroups[groupKey].timeSpent = task.timeSpentOnDay[day];
          });
      }
      return taskGroups;
    };

    const groups: { [key: string]: RowItem } = {};

    tasks.forEach((task: WorklogTask) => {
      const taskGroups = _mapToGroups(task);
      Object.keys(taskGroups).forEach(groupKey => {
        if (groups[groupKey]) {
          groups[groupKey].tasks.push(...taskGroups[groupKey].tasks);
          groups[groupKey].dates.push(...taskGroups[groupKey].dates);
          groups[groupKey].workStart = Math.min(groups[groupKey].workStart, taskGroups[groupKey].workStart);
          groups[groupKey].workEnd = Math.min(groups[groupKey].workEnd, taskGroups[groupKey].workEnd);
          groups[groupKey].timeEstimate += taskGroups[groupKey].timeEstimate;
          groups[groupKey].timeSpent += taskGroups[groupKey].timeSpent;
        } else {
          groups[groupKey] = taskGroups[groupKey];
        }
      });

    });

    const rows: RowItem[] = [];
    Object.keys(groups).sort().forEach((key => {
      const group = groups[key];

      group.titlesWithSub = unique(group.tasks.map(t => t.title));
      group.titles = unique(group.tasks.map(t => (
          t.parentId && tasks.find(pt_ => pt_.id === t.parentId).title
        ) || (!t.parentId && t.title)
      )).filter(title => !!title);
      group.dates = unique(group.dates).sort((a: string, b: string) => {
        const dateA: number = new Date(a).getTime();
        const dateB: number = new Date(b).getTime();
        if ( dateA === dateB ) {
          return 0;
        } else if ( dateA < dateB ) {
          return -1;
        }
        return 1;
      });

      rows.push(group);
    }));

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
            if (row.dates.length > 1) {
              return row.dates[0] + ' - ' + row.dates[row.dates.length - 1];
            }
            return row.dates[0];
          case 'START':
            const workStart = !row.workStart ? 0 : row.workStart;
            return (workStart)
              ? moment(
                (this.options.roundStartTimeTo)
                  ? roundTime(workStart, this.options.roundStartTimeTo)
                  : workStart
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
