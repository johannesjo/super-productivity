import { Observable, Subject, timer } from 'rxjs';
import { filter, first, map, takeUntil, tap } from 'rxjs/operators';
import { ShepherdService } from './shepherd.service';
import Step from 'shepherd.js/src/types/step';
import StepOptionsWhen = Step.StepOptionsWhen;

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

export const waitForElObs$ = (selector: string): Observable<any> => {
  return timer(50, 50).pipe(
    map(() => document.querySelector(selector)),
    filter((el) => !!el),
  );
};

export const nextOnObs = (
  obs: Observable<any>,
  shepherdService: ShepherdService,
  additionalOnShow?: () => void,
): StepOptionsWhen => {
  let _onDestroy$;
  return {
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
): StepOptionsWhen => {
  let onDestroy$;
  return {
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
  };
};
