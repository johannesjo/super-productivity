import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { Duration, Moment } from 'moment';
import { GoogleApiService } from '../google-api.service';
import { SnackService } from '../../snack/snack.service';

@Component({
  selector: 'dialog-google-export-time',
  templateUrl: './dialog-google-export-time.component.html',
  styleUrls: ['./dialog-google-export-time.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogGoogleExportTimeComponent implements OnInit {
  opts: any = {
    spreadsheetId: undefined,
    isAutoLogin: false,
    isAutoFocusEmpty: false,
    isRoundWorkTimeUp: undefined,
    roundStartTimeTo: undefined,
    roundEndTimeTo: undefined,
    roundWorkTimeTo: undefined,
    defaultValues: [
      ''
    ]
  };
  // $rootScope.r.uiHelper.timeSheetExportSettings;
  actualValues = [];
  isLoading = false;
  isLoggedIn = false;
  headings: string[] = [];
  lastRow: string[] = [];
  MISSING = {
    startedTimeToday: 'MISSING startedTimeToday',
    getTimeWorkedToday: 'MISSING getTimeWorkedToday',
    getToday: []
  };

  roundTimeOptions = [
    {id: 'QUARTER', title: 'full quarters'},
    {id: 'HALF', title: 'full half hours'},
    {id: 'HOUR', title: 'full hours'},
  ];


  constructor(
    public googleApiService: GoogleApiService,
    private _snackService: SnackService,
    private _cd: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    if (this.opts.isAutoLogin) {
      this.login()
        .then(() => {
          if (this.opts.spreadsheetId) {
            this.readSpreadsheet();
          }
        })
        .then(() => {
          this.updateDefaults();
        });
    }
  }

  cancel() {
    // $mdDialog.hide();
  }

  login() {
    this.isLoading = true;
    return this.googleApiService.login()
      .then(() => {
        this.isLoading = false;
        this.isLoggedIn = true;
        this._cd.detectChanges();
      });
  }

  readSpreadsheet() {
    this.isLoading = true;
    this.headings = undefined;
    return this.googleApiService.getSpreadsheetHeadingsAndLastRow(this.opts.spreadsheetId)
      .then((data: any) => {
        this.headings = data.headings;
        this.lastRow = data.lastRow;
        this.updateDefaults();
        this.isLoading = false;
        this._cd.detectChanges();
      });
  }

  logout() {
    this.isLoading = false;
    return this.googleApiService.logout()
      .then(() => {
        this.isLoading = false;
        this.isLoggedIn = false;
        this._cd.detectChanges();
      });
  }

  save() {
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

      this.googleApiService.appendRow(this.opts.spreadsheetId, this.actualValues)
        .then(() => {
          this._snackService.open({
            message: 'Row successfully appended',
            type: 'SUCCESS'
          });

          // $mdDialog.hide();
          // $rootScope.r.currentSession.isTimeSheetExported = true;
          this.isLoading = false;
        });
    }
  }

  updateDefaults() {
    this.opts.defaultValues.forEach((val, index) => {
      this.actualValues[index] = this.replaceVals(val);
    });
  }

  replaceVals(defaultVal: string): string {
    if (!defaultVal) {
      return;
    }

    const dVal = defaultVal.trim();

    if (dVal.match(/\{date:/)) {
      return this.getCustomDate(dVal);
    }

    switch (dVal) {
      case '{startTime}':
        return this.getStartTime();
      case '{currentTime}':
        return this.getCurrentTime();
      case '{date}':
        return moment().format('MM/DD/YYYY');
      case '{taskTitles}':
        return this.getTaskTitles();
      case '{subTaskTitles}':
        return this.getSubTaskTitles();
      case '{totalTime}':
        return this.getTotalTimeWorked();
      default:
        return dVal;
    }
  }

  private roundDuration(value: Duration, roundTo, isRoundUp): Duration {
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

  private roundTime(value: Moment, roundTo, isRoundUp = false): Moment {
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

  private getCustomDate(dVal: string): string {
    const dateFormatStr = dVal
      .replace('{date:', '')
      .replace('}', '')
      .trim();
    return moment().format(dateFormatStr);
  }

  private getStartTime() {
    const val = moment(this.MISSING.startedTimeToday);
    const roundTo = this.opts.roundStartTimeTo;
    return this.roundTime(val, roundTo)
      .format('HH:mm');
  }

  private getCurrentTime(): string {
    const val = moment();
    const roundTo = this.opts.roundEndTimeTo;

    return this.roundTime(val, roundTo)
      .format('HH:mm');
  }

  private getTotalTimeWorked(): string {
    const val = moment.duration(this.MISSING.getTimeWorkedToday);

    const roundTo = this.opts.roundWorkTimeTo;
    const dur = this.roundDuration(val, roundTo, this.opts.isRoundWorkTimeUp) as any;
    return dur.format('HH:mm');
  }

  private getTaskTitles(): string {
    const tasks = this.MISSING.getToday;
    let titleStr = '';
    tasks.forEach((task) => {
      titleStr += task.title + ', ';
    });
    return titleStr.substring(0, titleStr.length - 2);
  }

  private getSubTaskTitles(): string {
    const tasks = this.MISSING.getToday;
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

}
