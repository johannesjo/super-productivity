import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';

// TODO MOVE TO DEDICATED FILE
const IPC_EVENT_SHUTDOWN = 'SHUTDOWN';
const SUCCESS_ANIMATION_DURATION = 500;
const SUCCESS_ANIMATION_MAX_DURATION = 10000;


@Component({
  selector: 'daily-summary',
  templateUrl: './daily-summary.component.html',
  styleUrls: ['./daily-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailySummaryComponent implements OnInit {
  public IS;
  ELECTRON = IS_ELECTRON;
  public commitLog;
  public cfg: any = {};
  public doneTasks = [];
  public tasks = [];

  private successAnimationTimeout;
  private showSuccessAnimation;
  private successAnimationMaxTimeout;
  doneTasks = [];

  // calc total time spent on todays tasks
  totalTimeSpentTasks = null;

  // calc time spent on todays tasks today
  // use mysql date as it is sortable
  totalTimeSpentToday = null;

  constructor() {
  }

  ngOnInit() {
  }


  showExportModal() {
    // Dialogs('SIMPLE_TASK_SUMMARY', {
    //   settings: $rootScope.r.uiHelper.dailyTaskExportSettings,
    //   finishDayFn: finishDay,
    //   tasks: Tasks.getToday()
    // }, true);
  };

  showTimeSheetExportModal() {
    // Dialogs('TIME_SHEET_EXPORT', {
    //   settings: $rootScope.r.uiHelper.dailyTaskExportSettings,
    //   finishDayFn: finishDay,
    //   tasks: Tasks.getToday()
    // }, true);
  };

  finishDay() {
    // $rootScope.r.tomorrowsNote = tomorrowsNote;
    // Tasks.finishDay(clearDoneTasks, moveUnfinishedToBacklog);
    // save everything

    // if (IS_ELECTRON) {
    // NOTE: syncing for electron is done in a before unload action
    //   $mdDialog.show(
    //     $mdDialog.confirm()
    //       .clickOutsideToClose(false)
    //       .title('All Done! Shutting down now..')
    //       .textContent('You work is done. Time to go home!')
    //       .ariaLabel('Alert Shutdown')
    //       .ok('Aye aye! Shutdown!')
    //       .cancel('No, just clear the tasks')
    //   )
    //     .then(() => {
    //         initSuccessAnimation(() => {
    //           window.ipcRenderer.send(IPC_EVENT_SHUTDOWN);
    //         });
    //       },
    //       () => {
    //         initSuccessAnimation(() => {
    //           $state.go('daily-planner');
    //         });
    //       });
    // } else {
    //   if (GoogleDriveSync.config && GoogleDriveSync.config.isAutoSyncToRemote) {
    //     SimpleToast('CUSTOM', `Syncing Data to Google Drive.`, 'file_upload');
    //     GoogleDriveSync.saveTo();
    //   }
    //   initSuccessAnimation(() => {
    //     $state.go('daily-planner');
    //   });
    // }
  }


  private initSuccessAnimation(cb) {
    this.showSuccessAnimation = true;
    this.successAnimationTimeout = window.setTimeout(() => {
      if (cb) {
        cb();
      }
    }, SUCCESS_ANIMATION_DURATION);

    this.successAnimationMaxTimeout = window.setTimeout(() => {
      this.showSuccessAnimation = false;
    }, SUCCESS_ANIMATION_MAX_DURATION);
  }
}
