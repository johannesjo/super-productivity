import { AfterViewInit, ChangeDetectionStrategy, Component } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';
import { SHEPHERD_STANDARD_BTNS, SHEPHERD_STEPS, TOUR_ID } from './shepherd-steps.const';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { Actions } from '@ngrx/effects';
import { GlobalConfigService } from '../config/global-config.service';
import { concatMap, first, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { ProjectService } from '../project/project.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { EMPTY } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'shepherd',
  template: '',
  // templateUrl: './shepherd.component.html',
  // styleUrls: ['./shepherd.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShepherdComponent implements AfterViewInit {
  constructor(
    private shepherdService: ShepherdService,
    private layoutService: LayoutService,
    private taskService: TaskService,
    private actions$: Actions,
    private globalConfigService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _projectService: ProjectService,
    private _dataInitService: DataInitService,
    private _router: Router,
  ) {}

  ngAfterViewInit(): void {
    this.shepherdService.defaultStepOptions = {
      scrollTo: false,
      highlightClass: 'shepherd-highlight',
      arrow: true,
      cancelIcon: {
        enabled: true,
      },
      buttons: [],
    };

    this.shepherdService.modal = false;
    this.shepherdService.confirmCancel = false;

    if (
      !localStorage.getItem(LS.HAS_WELCOME_DIALOG_BEEN_SHOWN) &&
      navigator.userAgent !== 'NIGHTWATCH'
    ) {
      this._dataInitService.isAllDataLoadedInitially$
        .pipe(concatMap(() => this._projectService.list$.pipe(first())))
        .subscribe((projectList) => {
          if (projectList.length <= 2) {
            this.globalConfigService.cfg$.pipe(first()).subscribe((cfg) => {
              this.shepherdService.addSteps(
                SHEPHERD_STEPS(
                  this.shepherdService,
                  cfg,
                  this.actions$,
                  this.layoutService,
                  this.taskService,
                  this._router,
                ) as any,
              );
              this.shepherdService.start();
              this.shepherdService.show(TOUR_ID.Sync);
            });
          } else {
            localStorage.setItem(LS.HAS_WELCOME_DIALOG_BEEN_SHOWN, 'true');
          }
        });
    }
  }
}
