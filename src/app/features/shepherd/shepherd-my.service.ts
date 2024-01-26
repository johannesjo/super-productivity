import { Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
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

  async init(): Promise<void> {
    this.shepherdService.defaultStepOptions = {
      scrollTo: false,
      highlightClass: 'shepherd-highlight',
      arrow: true,
      cancelIcon: {
        enabled: false,
      },
      buttons: [],
    };

    this.shepherdService.modal = false;

    // TODO does not work yet
    // (this.shepherdService.tourObject as any).keyboardNavigation = false;

    const cfg = await this.globalConfigService.cfg$.pipe(first()).toPromise();
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
  }

  async show(id: TourId): Promise<void> {
    if (!this.shepherdService.isActive) {
      await this.init();
    }
    if (id !== TourId.Calendars && id !== TourId.ProductivityHelper) {
      await this._router.navigateByUrl('/');
    }
    this.shepherdService.show(id);
  }
}
