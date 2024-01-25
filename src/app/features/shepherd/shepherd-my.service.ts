import { Injectable } from '@angular/core';
import { LS } from '../../core/persistence/storage-keys.const';
import { concatMap, first } from 'rxjs/operators';
import { SHEPHERD_STEPS, TourId } from './shepherd-steps.const';
import { ShepherdService } from 'angular-shepherd';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { Actions } from '@ngrx/effects';
import { GlobalConfigService } from '../config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { ProjectService } from '../project/project.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class ShepherdMyService {
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

  init(): void {
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
            // this.shepherdService.show(TourId.AdvancedStuffChoice);
          });
        } else {
          localStorage.setItem(LS.IS_SHOW_TOUR, 'true');
        }
      });
  }

  async show(id: TourId): Promise<void> {
    if (!this.shepherdService.isActive) {
      this.init();
    }
    await this._router.navigateByUrl('/');
    this.shepherdService.show(id);
  }
}
