import { Observable, Subject } from 'rxjs';
import Shepherd from 'shepherd.js';
import { first, takeUntil, tap } from 'rxjs/operators';
import { ShepherdService } from 'angular-shepherd';
import Step = Shepherd.Step;
import { ofType } from '@ngrx/effects';
import { addTask } from '../tasks/store/task.actions';
import { hideAddTaskBar } from '../../core-ui/layout/store/layout.actions';

export const waitForEl = (selector: string, cb: () => void): void => {
  const int = window.setInterval(() => {
    if (document.querySelector(selector)) {
      window.clearInterval(int);
      cb();
    }
  }, 50);
};
export const waitForElRemove = (
  el: HTMLElement | Element | null,
  cb: () => void,
): void => {
  if (!el) {
    throw new Error('No el provided');
  }
  const int = window.setInterval(() => {
    if (!document.contains(el)) {
      window.clearInterval(int);
      cb();
    }
  }, 50);
};

export const nextOnObs = (
  obs: Observable<any>,
  shepherdService: ShepherdService,
): Partial<Step.StepOptions> => {
  let _onDestroy$;
  return {
    when: {
      show: () => {
        _onDestroy$ = new Subject<void>();
        obs
          .pipe(
            tap((v) => console.log('waitForObs', v)),
            first(),
            takeUntil(_onDestroy$),
          )
          .subscribe(() => shepherdService.next());
      },
      hide: () => {
        _onDestroy$.next();
        _onDestroy$.complete();
      },
    },
  };
};

export const twoWayObs = (
  fwd: {
    obs: Observable<any>;
    cbAfter?: () => void;
  },
  back: {
    obs: Observable<any>;
    cbAfter?: () => void;
  },
  shepherdService: ShepherdService,
): Partial<Step.StepOptions> => {
  let onDestroy$;
  return {
    when: {
      show: () => {
        onDestroy$ = new Subject();
        fwd.obs.pipe(ofType(addTask), first(), takeUntil(onDestroy$)).subscribe(() => {
          fwd.cbAfter?.();
          shepherdService.next();
        });
        back.obs
          .pipe(ofType(hideAddTaskBar), first(), takeUntil(onDestroy$))
          .subscribe(() => {
            back.cbAfter?.();
            shepherdService.back();
          });
      },
      hide: () => {
        onDestroy$.next();
        onDestroy$.complete();
      },
    },
  };
};
