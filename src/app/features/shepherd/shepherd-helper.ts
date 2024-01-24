import { Observable, Subject } from 'rxjs';
import Shepherd from 'shepherd.js';
import Step = Shepherd.Step;
import { first, takeUntil, tap } from 'rxjs/operators';

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

export const waitForObs = (
  obs: Observable<any>,
  cb: () => void,
): Partial<Step.StepOptions> => {
  let _onDestroy$;
  return {
    when: {
      show: () => {
        _onDestroy$ = new Subject<void>();
        obs
          .pipe(
            takeUntil(_onDestroy$),
            tap((v) => console.log('waitForObs', v)),
            first(),
          )
          .subscribe(() => cb());
      },
      hide: () => {
        _onDestroy$.next();
        _onDestroy$.complete();
      },
    },
  };
};
