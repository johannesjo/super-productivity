import { Observable, Subscriber } from 'rxjs';

export const observeWidth = (target: HTMLElement): Observable<number> => {
  return new Observable((observer: Subscriber<number>) => {
    // tslint:disable-next-line
    if ((window as any).ResizeObserver) {
      // tslint:disable-next-line
      const resizeObserver = new (window as any).ResizeObserver((entries: any[]) => {
        observer.next(entries[0].contentRect.width);
      });
      resizeObserver.observe(target);
      return () => {
        resizeObserver.unobserve(target);
      };
    } else {
      console.warn('ResizeObserver not supported in this browser');
      return undefined;
    }
  });
};
