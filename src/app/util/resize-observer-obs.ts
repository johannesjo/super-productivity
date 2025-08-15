import { Observable, Subscriber } from 'rxjs';
import { Log } from '../core/log';

export const observeWidth = (target: HTMLElement): Observable<number> => {
  return new Observable((observer: Subscriber<number>) => {
    // eslint-disable-next-line
    if ((window as any).ResizeObserver) {
      // eslint-disable-next-line
      const resizeObserver = new (window as any).ResizeObserver(
        (entries: ResizeObserverEntry[]) => {
          observer.next(entries[0].contentRect.width);
        },
      );
      resizeObserver.observe(target);
      return () => {
        resizeObserver.unobserve(target);
      };
    } else {
      Log.err('ResizeObserver not supported in this browser');
      return undefined;
    }
  });
};
