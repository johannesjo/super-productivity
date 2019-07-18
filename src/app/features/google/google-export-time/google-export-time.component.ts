import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import {GoogleTimeSheetExportCopy, Project} from '../../project/project.model';
import {TaskWithSubTasks} from '../../tasks/task.model';
import {Subject} from 'rxjs';
import {GoogleApiService} from '../google-api.service';
import {ProjectService} from '../../project/project.service';
import {TaskService} from '../../tasks/task.service';
import {SnackService} from '../../../core/snack/snack.service';
import {takeUntil} from 'rxjs/operators';
import * as moment from 'moment';
import {expandAnimation} from '../../../ui/animations/expand.ani';
import 'moment-duration-format';
import {msToClockString} from '../../../ui/duration/ms-to-clock-string.pipe';
import {loadFromSessionStorage, saveToSessionStorage} from '../../../core/persistence/local-storage';
import {SS_GOOGLE_TIME_SUBMITTED} from '../../../core/persistence/ls-keys.const';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {momentRoundTime} from '../../../util/round-time';
import {roundDuration} from '../../../util/round-duration';
import {T} from '../../../t.const';
import {TranslateService} from '@ngx-translate/core';

// TODO refactor to Observables
@Component({
  selector: 'google-export-time',
  templateUrl: './google-export-time.component.html',
  styleUrls: ['./google-export-time.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class GoogleExportTimeComponent implements OnInit, OnDestroy {
  @Input() day: string = getWorklogStr();
  @Output() saveData = new EventEmitter();

  T = T;

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
  isSubmitted = loadFromSessionStorage(SS_GOOGLE_TIME_SUBMITTED) || false;

  roundTimeOptions = [
    {id: 'QUARTER', title: T.F.GOOGLE.EXPORT_TIME.ROUND_QUARTER},
    {id: 'HALF', title: T.F.GOOGLE.EXPORT_TIME.ROUND_HALF},
    {id: 'HOUR', title: T.F.GOOGLE.EXPORT_TIME.ROUND_HOUR},
  ];

  loginPromise: Promise<any>;
  readPromise: Promise<any>;
  savePromise: Promise<any>;

  isSpreadSheetConfigured = false;
  isSpreadSheetRead = false;

  private _startedTimeToday: number;
  private _endTimeToday: number;
  private _totalTimeWorkedToday: number;
  private _todaysTasks: TaskWithSubTasks[];
  private _projectId: string;
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    public googleApiService: GoogleApiService,
    private _projectService: ProjectService,
    private _taskService: TaskService,
    private _snackService: SnackService,
    private _translateService: TranslateService,
    private _cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    this._projectService.currentProject$
      .pipe(takeUntil(this._destroy$))
      .subscribe((project: Project) => {
        this.opts = {...project.advancedCfg.googleTimeSheetExport};
        this._projectId = project.id;
        this._startedTimeToday = project.workStart[this.day];
        this._endTimeToday = project.workEnd[this.day];
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

    if (this.opts.isAutoLogin) {
      this.login()
        .then(() => {
          if (this.opts.spreadsheetId) {
            return this.readSpreadsheet();
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
    this.readPromise = this.googleApiService.getSpreadsheetHeadingsAndLastRow$(this.opts.spreadsheetId).toPromise();
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
    this.isSubmitted = false;
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
      this._snackService.open(this._translateService.instant(T.F.GOOGLE.EXPORT_TIME.SNACK_EQUAL_VALUES));
    } else {

      this.savePromise = this.googleApiService.appendRow$(this.opts.spreadsheetId, this.actualValues).toPromise();
      this.savePromise.then(() => {
        this._snackService.open({
          msg: T.F.GOOGLE.EXPORT_TIME.SNACK_ROW_APPENDED,
          type: 'SUCCESS'
        });

        this._projectService.updateTimeSheetExportSettings(this._projectId, this.opts, true);
        this.isLoading = false;
        this.isSubmitted = true;
        this._cd.detectChanges();
        saveToSessionStorage(SS_GOOGLE_TIME_SUBMITTED, true);
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
      case '{endTime}':
        return this._getEndTime();
      case '{date}':
        return moment(this.day).format('MM/DD/YYYY');
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
    return momentRoundTime(val, roundTo)
      .format('HH:mm');
  }

  private _getEndTime() {
    const val = moment(this._endTimeToday);
    const roundTo = this.opts.roundEndTimeTo;
    return momentRoundTime(val, roundTo)
      .format('HH:mm');
  }

  private _getCurrentTime(): string {
    const val = moment();
    const roundTo = this.opts.roundEndTimeTo;

    return momentRoundTime(val, roundTo)
      .format('HH:mm');
  }

  private _getTotalTimeWorked(): string {
    const val = moment.duration(this._totalTimeWorkedToday);
    const roundTo = this.opts.roundWorkTimeTo;
    const dur = roundDuration(val, roundTo, this.opts.isRoundWorkTimeUp);
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
    this._cd.detectChanges();
  }
}
