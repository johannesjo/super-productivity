import { Observable, Subject } from 'rxjs';
import Shepherd from 'shepherd.js';
import { first, takeUntil, tap } from 'rxjs/operators';
import { ShepherdMyService } from './shepherd-my.service';
import Step = Shepherd.Step;

export const waitForEl = (selector: string, cb: () => void): number => {
  const int = window.setInterval(() => {
    console.log('INT');

    if (document.querySelector(selector)) {
      window.clearInterval(int);
      cb();
    }
  }, 50);
  return int;
};
export const waitForElRemove = (
  el: HTMLElement | Element | null,
  cb: () => void,
): number => {
  if (!el) {
    throw new Error('No el provided');
  }
  const int = window.setInterval(() => {
    if (!document.contains(el)) {
      window.clearInterval(int);
      cb();
    }
  }, 50);
  return int;
};

export const nextOnObs = (
  obs: Observable<any>,
  shepherdService: ShepherdMyService,
  additionalOnShow?: () => void,
): Partial<Step.StepOptions> => {
  let _onDestroy$;
  return {
    when: {
      show: () => {
        if (additionalOnShow) {
          additionalOnShow();
        }
        _onDestroy$ = new Subject<void>();
        obs
          .pipe(
            tap((v) => console.log('nextOnObs', v)),
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
  shepherdService: ShepherdMyService,
): Partial<Step.StepOptions> => {
  let onDestroy$;
  return {
    when: {
      show: () => {
        onDestroy$ = new Subject();
        fwd.obs.pipe(first(), takeUntil(onDestroy$)).subscribe(() => {
          fwd.cbAfter?.();
          shepherdService.next();
        });
        if (back) {
          back.obs.pipe(first(), takeUntil(onDestroy$)).subscribe(() => {
            back.cbAfter?.();
            shepherdService.back();
          });
        }
      },
      hide: () => {
        onDestroy$.next();
        onDestroy$.complete();
      },
    },
  };
};
