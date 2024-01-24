import { AfterViewInit, ChangeDetectionStrategy, Component } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';
import { SHEPHERD_STANDARD_BTNS, SHEPHERD_STEPS } from './shepherd-steps.const';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { Actions } from '@ngrx/effects';
import { GlobalConfigService } from '../config/global-config.service';
import { first } from 'rxjs/operators';

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
    // this.shepherdService.modal = true;
    // this.shepherdService.confirmCancel = false;

    this.globalConfigService.cfg$.pipe(first()).subscribe((cfg) => {
      this.shepherdService.addSteps(
        SHEPHERD_STEPS(
          this.shepherdService,
          cfg,
          this.actions$,
          this.layoutService,
          this.taskService,
        ) as any,
      );
      this.shepherdService.start();
    });
  }
}
