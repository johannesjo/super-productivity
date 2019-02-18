import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { GoogleTimeSheetExportCopy, Project } from '../../project/project.model';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { Subject } from 'rxjs';
import { GoogleApiService } from '../google-api.service';
import { ProjectService } from '../../project/project.service';
import { TaskService } from '../../tasks/task.service';
import { SnackService } from '../../../core/snack/snack.service';
import { takeUntil } from 'rxjs/operators';
import * as moment from 'moment-mini';
import { Duration, Moment } from 'moment-mini';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import 'moment-duration-format';
import { msToClockString } from '../../../ui/duration/ms-to-clock-string.pipe';

// TODO refactor to Observables
@Component({
  selector: 'google-export-time',
  templateUrl: './google-export-time.component.html',
  styleUrls: ['./google-export-time.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GoogleExportTimeComponent implements OnInit, OnDestroy {
  @Output() saveData = new EventEmitter();

  opts: GoogleTimeSheetExportCopy = {
    spreadsheetId: undefined,
    isAutoLogin: false,
    isAutoFocusEmpty: false,
    isRoundWorkTimeUp: undefined,
    roundStartTimeTo: undefined,
    roundEndTimeTo: undefined,
    roundWorkTimeTo: undefined,
    lastExported: undefined,
    defaultValues: []
  };

  actualValues = [];
  isLoading = false;
  isLoggedIn = false;
  headings: string[] = [];
  lastRow: string[] = [];

  roundTimeOptions = [
    {id: 'QUARTER', title: 'full quarters'},
    {id: 'HALF', title: 'full half hours'},
    {id: 'HOUR', title: 'full hours'},
  ];

  loginPromise: Promise<any>;
  readPromise: Promise<any>;
  savePromise: Promise<any>;

  isSpreadSheetConfigured = false;
  isSpreadSheetRead = false;

  private _startedTimeToday: number;
  private _totalTimeWorkedToday: number;
  private _todaysTasks: TaskWithSubTasks[];
  private _projectId: string;
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    public googleApiService: GoogleApiService,
    private _projectService: ProjectService,
    private _taskService: TaskService,
    private _snackService: SnackService,
    private _cd: ChangeDetectorRef,
  ) {
    this._projectService.currentProject$
      .pipe(takeUntil(this._destroy$))
      .subscribe((project: Project) => {
        this.opts = {...project.advancedCfg.googleTimeSheetExport};
        this._projectId = project.id;
        this._startedTimeToday = project.startedTimeToday;
        this.isSpreadSheetConfigured = this.opts.spreadsheetId && this.opts.spreadsheetId.length > 5;
      });
    this._taskService.todaysTasks$
      .pipe(takeUntil(this._destroy$))
      .subscribe((tasks: TaskWithSubTasks[]) => {
        this._todaysTasks = tasks;
      });
    this._taskService.workingToday$
      .pipe(takeUntil(this._destroy$))
      .subscribe((timeWorked) => {
        this._totalTimeWorkedToday = timeWorked;
      });
  }

  ngOnInit() {
    if (this.opts.isAutoLogin) {
      this.isLoading = true;
      this.login()
        .then(() => {
          if (this.opts.spreadsheetId) {
            this.readSpreadsheet()
              .then(() => {
                this.isLoading = false;
              });
          }
        })
        .then(() => {
          this.updateDefaults();
        }).catch(this._handleError.bind(this));
    }
  }

  ngOnDestroy() {
    this._destroy$.next(true);
    this._destroy$.unsubscribe();
  }


  login() {
    this.isLoading = true;
    this.loginPromise = this.googleApiService.login();
    return this.loginPromise.then(() => {
      this.isLoading = false;
      this.isLoggedIn = true;
      this._cd.detectChanges();
    }).catch(this._handleError.bind(this));
  }

  readSpreadsheet() {
    this.isLoading = true;
    this.isSpreadSheetRead = false;
    this.headings = undefined;
    this.readPromise = this.googleApiService.getSpreadsheetHeadingsAndLastRow(this.opts.spreadsheetId).toPromise();
    this._cd.detectChanges();
    return this.readPromise.then((data: any) => {
      this.headings = data.headings;
      this.lastRow = data.lastRow;
      this.updateDefaults();
      this.isLoading = false;
      this.isSpreadSheetConfigured = true;
      this.isSpreadSheetRead = true;
      this._cd.detectChanges();
    }).catch(this._handleError.bind(this));
  }

  logout() {
    this.isLoading = false;
    return this.googleApiService.logout()
      .then(() => {
        this.isLoading = false;
        this.isLoggedIn = false;
        this._cd.detectChanges();
      }).catch(this._handleError.bind(this));
  }

  save() {
    this._projectService.updateTimeSheetExportSettings(this._projectId, this.opts);
    this.isLoading = true;
    const arraysEqual = (arr1, arr2) => {
      if (arr1.length !== arr2.length) {
        return false;
      }
      for (let i = arr1.length; i--;) {
        if (arr1[i] !== arr2[i]) {
          return false;
        }
      }
      return true;
    };

    if (arraysEqual(this.actualValues, this.lastRow)) {
      this._snackService.open('Current values and the last saved row have equal values, that is probably not what you want.');
    } else {

      this.savePromise = this.googleApiService.appendRow(this.opts.spreadsheetId, this.actualValues).toPromise();
      this.savePromise.then(() => {
        this._snackService.open({
          message: 'Row successfully appended',
          type: 'SUCCESS'
        });

        this._projectService.updateTimeSheetExportSettings(this._projectId, this.opts, true);
        this.isLoading = false;
        this._cd.detectChanges();
      }).catch(this._handleError.bind(this));
    }
  }

  updateDefaults() {
    this.opts.defaultValues.forEach((val, index) => {
      this.actualValues[index] = this._replaceVals(val);
    });
  }

  private _replaceVals(defaultVal: string): string {
    if (!defaultVal) {
      return;
    }

    const dVal = defaultVal.trim();

    if (dVal.match(/\{date:/)) {
      return this._getCustomDate(dVal);
    }

    switch (dVal) {
      case '{startTime}':
        return this._getStartTime();
      case '{currentTime}':
        return this._getCurrentTime();
      case '{date}':
        return moment().format('MM/DD/YYYY');
      case '{taskTitles}':
        return this._getTaskTitles();
      case '{subTaskTitles}':
        return this._getSubTaskTitles();
      case '{totalTime}':
        return this._getTotalTimeWorked();
      default:
        return dVal;
    }
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

  private _roundTime(value: Moment, roundTo, isRoundUp = false): Moment {
    let rounded;

    switch (roundTo) {
      case 'QUARTER':
        rounded = Math.round(value.minute() / 15) * 15;
        if (isRoundUp) {
          rounded = Math.ceil(value.minute() / 15) * 15;
        }
        return value.minute(rounded).second(0);

      case 'HALF':
        rounded = Math.round(value.minute() / 30) * 30;
        if (isRoundUp) {
          rounded = Math.ceil(value.minute() / 30) * 30;
        }
        return value.minute(rounded).second(0);

      case 'HOUR':
        rounded = Math.round(value.minute() / 60) * 60;
        if (isRoundUp) {
          rounded = Math.ceil(value.minute() / 60) * 60;
        }
        return value.minute(rounded).second(0);

      default:
        return value;
    }
  }

  private _getCustomDate(dVal: string): string {
    const dateFormatStr = dVal
      .replace('{date:', '')
      .replace('}', '')
      .trim();
    return moment().format(dateFormatStr);
  }

  private _getStartTime() {
    const val = moment(this._startedTimeToday);
    const roundTo = this.opts.roundStartTimeTo;
    return this._roundTime(val, roundTo)
      .format('HH:mm');
  }

  private _getCurrentTime(): string {
    const val = moment();
    const roundTo = this.opts.roundEndTimeTo;

    return this._roundTime(val, roundTo)
      .format('HH:mm');
  }

  private _getTotalTimeWorked(): string {
    const val = moment.duration(this._totalTimeWorkedToday);
    const roundTo = this.opts.roundWorkTimeTo;
    const dur = this._roundDuration(val, roundTo, this.opts.isRoundWorkTimeUp) as any;
    return msToClockString(dur.as('milliseconds'));
  }

  private _getTaskTitles(): string {
    const tasks = this._todaysTasks || [];
    let titleStr = '';
    tasks.forEach((task) => {
      titleStr += task.title + ', ';
    });
    return titleStr.substring(0, titleStr.length - 2);
  }

  private _getSubTaskTitles(): string {
    const tasks = this._todaysTasks;
    let titleStr = '';
    tasks.forEach((task) => {
      if (task.subTasks) {
        task.subTasks.forEach((subTask) => {
          titleStr += subTask.title + ', ';
        });
      } else {
        titleStr += task.title + ', ';
      }
    });
    return titleStr.substring(0, titleStr.length - 2);
  }

  private _handleError() {
    this.isLoading = false;
  }
}
