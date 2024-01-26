import { Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { SHEPHERD_STEPS, TourId } from './shepherd-steps.const';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { Actions } from '@ngrx/effects';
import { GlobalConfigService } from '../config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { WorkContextService } from '../work-context/work-context.service';
import Shepherd from 'shepherd.js';
import Step = Shepherd.Step;

@Injectable({
  providedIn: 'root',
})
export class ShepherdMyService {
  isActive = false;
  tourObject?: Shepherd.Tour;

  constructor(
    private layoutService: LayoutService,
    private taskService: TaskService,
    private actions$: Actions,
    private globalConfigService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _router: Router,
    private workContextService: WorkContextService,
  ) {}

  async init(): Promise<void> {
    this._initialize();

    const cfg = await this.globalConfigService.cfg$.pipe(first()).toPromise();
    this.addSteps(
      SHEPHERD_STEPS(
        this,
        cfg,
        this.actions$,
        this.layoutService,
        this.taskService,
        this._router,
        this.workContextService,
      ) as any,
    );

    // this.shepherdService.tourObject.steps.forEach((step) => {
    //   const prevWhenShow = step.options.when?.show;
    //   const prevWhenHide = step.options.when?.hide;
    //   console.log(step.options);
    //
    //   step.updateStepOptions({
    //     ...step.options,
    //     // when: {
    //     //   show: () => {
    //     //     console.log('XXXXXXX');
    //     //
    //     //     if (typeof prevWhenShow === 'function') {
    //     //       // @ts-ignore
    //     //       prevWhenShow();
    //     //     }
    //     //   },
    //     //   hide: prevWhenHide,
    //     // } as any,
    //     when: undefined,
    //   });
    //   console.log(step);
    //
    //   // const el = step.getElement();
    //   // console.log(el);
    //   // (el as any).focus = () => undefined;
    // });
    this.start();
  }

  async show(id: TourId): Promise<void> {
    if (!this.isActive) {
      await this.init();
    }
    if (id !== TourId.Calendars && id !== TourId.ProductivityHelper) {
      await this._router.navigateByUrl('/');
    }

    this.tourObject?.show(id);
  }

  back(): void {
    this.tourObject?.back();
  }

  cancel(): void {
    this.tourObject?.cancel();
  }

  complete(): void {
    this.tourObject?.complete();
  }

  hide(): void {
    this.tourObject?.hide();
  }

  next(): void {
    this.tourObject?.next();
  }

  start(): void {
    this.isActive = true;
    this.tourObject?.start();
  }

  /**
   * Take a set of steps and create a tour object based on the current configuration
   * @param steps An array of steps
   */
  addSteps(steps: Array<Step.StepOptions>): void {
    this._initialize();
    const tour = this.tourObject;
    if (!tour) {
      throw new Error('Tour not ready');
    }

    steps.forEach((step) => {
      if (step.buttons) {
        step.buttons = step.buttons.map(this._makeButton.bind(this), this);
      }

      tour.addStep(step);
    });
  }

  private _initialize(): void {
    const tourObject = new Shepherd.Tour({
      defaultStepOptions: {
        scrollTo: false,
        highlightClass: 'shepherd-highlight',
        arrow: true,
        cancelIcon: {
          enabled: false,
        },
        buttons: [],
      },
      confirmCancel: false,
      keyboardNavigation: false,
      tourName: 'Cool tour',
      useModalOverlay: false,
      exitOnEsc: false,
    });
    tourObject.on('complete', this._onTourFinish.bind(this, 'complete'));
    tourObject.on('cancel', this._onTourFinish.bind(this, 'cancel'));
    this.tourObject = tourObject;
  }

  private _makeButton(button): any {
    const { classes, disabled, label, secondary, type, text } = button;
    const builtInButtonTypes = ['back', 'cancel', 'next'];

    if (!type) {
      return button;
    }

    if (builtInButtonTypes.indexOf(type) === -1) {
      throw new Error(`'type' property must be one of 'back', 'cancel', or 'next'`);
    }

    return {
      action: this[type].bind(this),
      classes,
      disabled,
      label,
      secondary,
      text,
    };
  }

  private _onTourFinish(completeOrCancel: string): void {
    this.isActive = false;
  }
}
