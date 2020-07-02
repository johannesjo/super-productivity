import { Observable } from 'rxjs';

// type should be ResizeObserverEntry
export const observeResize = (target: HTMLElement): Observable<any[]> => {
  return new Observable((observer) => {
    // tslint:disable-next-line
    if (window['ResizeObserver']) {
      // tslint:disable-next-line
      const resizeObserver = new window['ResizeObserver']((entries) => {
        observer.next(entries);
      });
      resizeObserver.observe(target);
      return () => {
        resizeObserver.unobserve(target);
      };
    } else {
      console.warn('ResizeObserver not supported in this browser');
    }
  });
};

export const observeWidth = (target: HTMLElement): Observable<number> => {
  return new Observable((observer) => {
    // tslint:disable-next-line
    if (window['ResizeObserver']) {
      // tslint:disable-next-line
      const resizeObserver = new window['ResizeObserver']((entries) => {
        observer.next(entries[0].contentRect.width);
      });
      resizeObserver.observe(target);
      return () => {
        resizeObserver.unobserve(target);
      };
    } else {
      console.warn('ResizeObserver not supported in this browser');
    }
  });
};
